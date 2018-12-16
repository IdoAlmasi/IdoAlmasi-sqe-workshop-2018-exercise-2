import * as esprima from 'esprima';

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse);
};

let commands = {'Program': programHandler , 'VariableDeclaration' : varDeclarationHandler , 'FunctionDeclaration': functionHandler ,
    'WhileStatement': whileHandler , 'IfStatement': ifHandler , 'BlockStatement': blockHandler ,
    'ExpressionStatement': expressionHandler, 'AssignmentExpression':assignmentExpressionHandler ,
    'BinaryExpression': binaryExpressionHandler , 'ReturnStatement':returnHandler};

let symbolTable = {};
let functionArgs = [];

function extractFunctionArgs(args) {
    if(args!=='') {
        let parsedCode = parseCode(args);
        functionArgs = parsedCode.body[0].expression.expressions;
    }
}

function symbolSub(parsedCode){
    let func = commands[parsedCode.type];
    func !== undefined ? commands[parsedCode.type](parsedCode): null;
}

function programHandler(parsedCode) {
    let progBody = parsedCode.body;
    progBody.map(symbolSub);
}

function varDeclarationHandler(parsedCode) {
    let declarations = parsedCode.declarations;
    declarations.map(createVarDeclRow);
}

function createVarDeclRow(x){ //todo: check if this is legal: Arr[i] = ... + Perhaps didn't handle all cases of init (array expressions)
    if(!isIdentifier(x.init)) {
        symbolSub(x.init);
        symbolTable[x.id.name] = x.init;
    }
    else {
        symbolTable[x.id.name] = symbolTable[x.init.name];
        x.init = symbolTable[x.id.name];
    }
}

function isIdentifier(x){
    return x.type === 'Identifier';
}

function functionHandler(parsedCode) {
    let params = parsedCode.params.map(x=>x.name);
    for(let i=0; i<params.length; i++)
        symbolTable[params[i]] = functionArgs[i];
    symbolSub(parsedCode.body);
}

function expressionHandler(parsedCode) {
    return expressionTypeHandler(parsedCode.expression);
}

function expressionTypeHandler(parsedCode) {
    if(isAssignmentExpr(parsedCode)){
        return assignmentExpressionHandler(parsedCode);
    }
}

function assignmentExpressionHandler(parsedCode) {
    if(isIdentifier(parsedCode.right)) {
        symbolTable[parsedCode.left.name] = symbolTable[parsedCode.right.name];
        parsedCode.right = symbolTable[parsedCode.left.name];
    }
    else {
        symbolSub(parsedCode.right);
        symbolTable[parsedCode.left.name] = parsedCode.right;
    }
}

function binaryExpressionHandler(parsedCode){
    if(isIdentifier(parsedCode.left))
        parsedCode.left = symbolTable[parsedCode.left.name];
    else
        symbolSub(parsedCode.left);
    if(isIdentifier(parsedCode.right))
        parsedCode.right = symbolTable[parsedCode.right.name];
    else
        symbolSub(parsedCode.right);
}

function isAssignmentExpr(parsedCode) {
    return parsedCode.type==='AssignmentExpression';
}

function whileHandler(parsedCode) {
    symbolSub(parsedCode.test);
    symbolSub(parsedCode.body);
}

function ifHandler(parsedCode) {
    symbolSub(parsedCode.consequent);
    elseIfHandler(parsedCode.alternate);
}

function elseIfHandler(parsedCode) {
    if (parsedCode === null)
        return;
    else if (isIfStatement(parsedCode)){
        symbolSub(parsedCode.consequent);
        elseIfHandler(parsedCode.alternate);
    }
    else
        symbolSub(parsedCode);
}
function isIfStatement(parsedCode) {
    return parsedCode.type === 'IfStatement';
}

function blockHandler(parsedCode){
    let blockBody = parsedCode.body;
    blockBody.map(symbolSub);
}

function returnHandler(parsedCode){
    if(isIdentifier(parsedCode.argument))
        parsedCode.argument = symbolTable[parsedCode.argument.name];
    else
        symbolSub(parsedCode.argument);
}

export {parseCode , symbolSub , symbolTable , extractFunctionArgs};
