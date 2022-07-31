//these words should not appear as column name
const invalid_words = ['select', 'in'];

let field_function = ['concat', 'add', 'subtract', 'divide', 'multiply', 'number', 'toDecimal', 'map'];
const character_codes = {
  space: 32,
  comma: 44,
  open_parenthess: 40,
  close_parenthess: 41,
  multiply: 42,
  add: 43,
  subtract: 45,
  divide: 47,
  double_quote: 34,
};


//separate words based on pre-defined tokens
function wordSeparator(input_text) {
  //we will go character by chracter
  let character_array = Array.from(input_text);

  let words = [];

  let running_character = [];
  let character_count = 0;
  let double_quote_count = 0;

  for (let each_char of character_array) {
    //if we encounter a space , or comma then we conside it end of the current word
    let character_code = each_char.charCodeAt(0);
    //increase character_count by 1
    character_count = character_count + 1;

    //if a a charater start with ' " ' will will keep storing them untill another ' " ' is found

    if (character_code === character_codes.double_quote || double_quote_count === 1) {
      //let say after a trip the count is already 1
      if (double_quote_count === 1) {
        //keep storing words
        if (character_code !== character_codes.double_quote) {
          running_character.push(each_char);
        } else if (character_code === character_codes.double_quote && double_quote_count === 1) {
          //an end is found reset the counter and push the currently hold word
          double_quote_count = 0;
          const new_word = running_character.join('');
          words.push(new_word);
          running_character = [];
        }
      } else {
        //first time encounter
        double_quote_count = 1;
        //push nothing
      }
    } else if ([character_codes.space, character_codes.comma].includes(character_code)) {
      //if a space  is encounterd push the whole content of running_character set into  words array
      let new_word = running_character.join('');
      if (new_word.length > 0) {
        words.push(new_word);
      }
      running_character = [];
    } else {
      running_character.push(each_char);
      //else if it the end then push it
      if (character_count === character_array.length) {
        let new_word = running_character.join('');
        words.push(new_word);
      }
    }
  }
  return words;
}

//remove uneed space after comma, or other signs only
//also remove any invalid sign that precedes valid character or sign
function consolidateSpace(input_text) {
  let character_array = Array.from(input_text);
  let character_array_length = character_array.length;
  let foward_index = Math.min(character_array_length, 0);
  let last_encounterd_comma_at_index = -1;

  let valid_chacter_start_at_found = false;

  let running_character = [];

  while (foward_index != character_array_length) {
    let current_chacter = character_array[foward_index];
    let character_code = current_chacter.charCodeAt(0);

    if ([character_codes.comma].includes(character_code)) {
      //if a comma is found then store the current index in a variable
      //forwarding next if a space is found there remove it do it untill
      //not space is found (any character other than space is encountered make it to -1)
      last_encounterd_comma_at_index = foward_index;
      if (valid_chacter_start_at_found) {
        running_character.push(current_chacter);
      }
    } else {
      if ([character_codes.space].includes(character_code)) {
        //a space has been found
        //then check if the a comma is stored in the index (not -1)
        //then dont push
        if (last_encounterd_comma_at_index !== -1) {
        } else {
          if (valid_chacter_start_at_found) {
            running_character.push(current_chacter);
          }
        }
      } else {
        //any character other than space or comma is found then reset the comma
        last_encounterd_comma_at_index = -1;
        valid_chacter_start_at_found = true;
        running_character.push(current_chacter);
      }
    }

    foward_index = foward_index + 1;
  }

  //remove any sign or character from start or end

  return running_character.join('');
}

//if a '(' or ')' is  found then add space after and before it
function addPaddingAfterParenthes(input_text) {
  let character_array = Array.from(input_text);

  let new_array = [];

  for (let each_char of character_array) {
    let character_code = each_char.charCodeAt(0);

    if ([character_codes.open_parenthess, character_codes.close_parenthess, character_codes.add].includes(character_code)) {
      new_array.push(String.fromCharCode(character_codes.space));
      new_array.push(each_char);
      new_array.push(String.fromCharCode(character_codes.space));
    } else {
      new_array.push(each_char);
    }
  }
  return new_array.join('');
}

//pass the word and whole words array to it
function selectTokenizer(words) {
  //if a select word is found
  //go over each words untill a from clause is found that will be the table name.
  //["select", "name", "as", "customer name", "from", "table 1"]
  //while parsing this expression we encount "as words"

  let invalid_words = ['select'];
  let action_words = ['group by', 'sort by', 'where'];

  let field_function = ['concat', 'add', 'subtract', 'divide', 'multiply', 'number', 'toDecimal', 'map'];
  let token_info = {
    query_action: 'select',
    mongo_action: 'project',

    collections: null,
    is_table_scope_use: false, //table scope when a . notation is used to access field on table,
    is_join: false, //make it true if and only an where clause if found when 'is_table_scope_use' is also true
  };

  let name_tokens = [];

  let error = {
    is_error: false,
    error: '',
    position: -1,
  };
  let from_found = false;
  let from_postion = -1;
  let q_words = words.slice(1);
  for (let [index, each_word] of q_words.entries()) {
    //after select we expect some column name , if any reserverd words for select tokenizer
    //is found return an error and exit the loop
    if (invalid_words.includes(each_word)) {
      error.position = index;
      error.error = 'invalid word after select';
      break;
    } else {
      //if the word is "from"
      if (each_word === 'from') {
        from_found = true;
        from_postion = index; //using this index we will slice up the array to get(calculate) columns
        //if a from is already found
        //the word after that will be the table name, store that word and break the loop
        if (from_found) {
          //now here 2 condtion arised
          //there can be multiple table (simple join)
          //from this place we will advance each word untill we ran out, if another action word is found (eg. where, group by) we stop
          let to_end_array = q_words.slice(Math.min(index + 1, q_words.length));
          let end_index = 0; //default postion is the word found just after "from"
          for (let [index, tword] of to_end_array.entries()) {
            end_index = index;
            if (action_words.includes(tword)) {
              break;
            }
          }
          //if the end_index is not 0 means it may have multiple tables
          //or a single table with name, or both
          let number_of_words = end_index + 1;

          if (number_of_words > 1) {
            //tables object
            token_info.is_table_scope_use = true;
            const tables = [];

            table_slice = to_end_array.slice(0, end_index + 1);
            let section_width = table_slice.length / 3;
            //for now "as" is required
            for (let pair_index = 0; pair_index <= section_width + 1; pair_index += 3) {
              let orginal_table = table_slice[pair_index];
              let table_as = table_slice[pair_index + 2];
              tables.push({ orginal_table: orginal_table, table_as: table_as });
            }
            token_info.collections = tables;
          } else {
            token_info.collections = to_end_array[end_index];
          }

          break;
        }
      }
    }
  }

  //column analysis
  let data_col = q_words.slice(0, from_postion);
  //this array will have related words for column,

  //while reading if a wild card found ignore other
  let function_expression_array = [];
  let current_col_token = {
    has_formula: false,
    has_name: false,
    function_expression: [],
    col_name_as: null,
  };
  for (let [_, each_word] of data_col.entries()) {
    if (each_word === '*') {
      ignore_cols = true;
      name_tokens.push({
        col_mode: 'all', //or function, "exact col name"
      });
    } else {
      //if the word match with some function the expect an "(" and ")",

      if (field_function.includes(each_word)) {
        function_expression_array.push(each_word);
        current_col_token.has_formula = true;
      } else if (each_word === ')') {
        //function has ended,
        function_expression_array.push(each_word);
        current_col_token.function_expression = function_expression_array;
      } else if (each_word === 'as') {
        //expecet an column name after it
        current_col_token.has_name = true;
      } else {
        //if "as" is already found the other col immeadily is the col name
        if (current_col_token.has_name) {
          current_col_token.col_name_as = each_word;
          current_col_token.function_expression = function_expression_array;
          name_tokens.push(current_col_token);

          //reset
          function_expression_array = [];
          current_col_token = {};
        } else {
          function_expression_array.push(each_word);
        }
      }
    }
  }
  token_info.name_tokens = name_tokens;

  //now after column token is found build project stages
  let project_stage = {};
  for (let cols_express of name_tokens) {
    let sub_stage = {};
    let has_name = cols_express.has_name;
    let function_expression = cols_express.function_expression;
    if (has_name) {
      let _rename = cols_express.col_name_as;
      sub_stage[`${_rename}`] = `$${function_expression[0]}`;
    }
    project_stage = { ...project_stage, ...sub_stage };
  }


  if (error.is_error) {
    throw error;
  }
  return {
    $project: {
      ...project_stage,
    },
  };
}

let sql_text = 'select contact_age as "age" from customer';
let tokens = wordSeparator(consolidateSpace(addPaddingAfterParenthes(sql_text)));

try {
  let stage = selectTokenizer(tokens);
  console.log('stage', stage);
} catch (error) {
  console.error(error);
}

