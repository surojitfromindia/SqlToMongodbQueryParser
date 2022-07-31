//analyze function syntax and create out put
//simple function analyzers

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



//extract function value
function extractFunction(first_entry) {

  let operand_stack = [];
  let operator_stack = [];
  let brace_stack = [];

  for (let ent of first_entry) {
    if (field_function.includes(ent)) {
      operator_stack.push(ent);
    }
    //if a opening brace is found keep pushing the numbers until a closing is found
    else if (ent === '(') {
      brace_stack.push(ent);
      operand_stack.push(ent);
    }
    //an closing brace is found
    else if (ent === ')') {
      let temp_b_object = {
        action: null,
        expressions: [],
      };
      temp_b_object.action = operator_stack.pop();
      //keep poping untill the matcing "(" is found
      let operand;
      while (operand !== '(') {
        operand = operand_stack.pop();
        if (operand !== '(') {
          temp_b_object.expressions.push(operand);
        }
      }

      //reverse the expression array  as we pop the data and append
      //we must retain order of operation as input
      temp_b_object.expressions = temp_b_object.expressions.reverse();
      operand_stack.push(temp_b_object);
      brace_stack.pop();
    } else {
      operand_stack.push(ent);
    }
  }

  return operand_stack.pop()

}

module.exports = {
  extractFunction,
};

