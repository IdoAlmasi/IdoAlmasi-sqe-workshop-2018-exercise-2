import * as esprima from 'esprima';
import * as estraverse from 'estraverse';

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse);
};

let commands = {'VariableDeclaration' : varDeclarationHandler , 'FunctionDeclaration': functionHandler ,
    'WhileStatement': whileHandler , 'IfStatement': ifHandler , 'BlockStatement': blockHandler ,
    'ExpressionStatement': expressionHandler, 'AssignmentExpression':assignmentExpressionHandler ,
    'BinaryExpression': binaryExpressionHandler , 'MemberExpression': memberExpressionHandler  ,
    'ReturnStatement':returnHandler};

let symbolTable = {};
let functionArgs = [];
let functionParams = [];
let globalVars = [];

function extractFunctionArgs(args) {
    functionArgs = [];
    if(args!=='') {
        let parsedCode = parseCode(args);
        if(parsedCode.body[0].expression.type === 'SequenceExpression')
            functionArgs = parsedCode.body[0].expression.expressions;
        else
            functionArgs = [parsedCode.body[0].expression];
    }
}

function symbolicSubstitution(parsedCode){
    symbolTable = {};
    functionParams = [];
    globalVars = [];
    parsedCode.body.map(x => {
        if (x.type === 'Variable Declaration')
            x.declarations.map(decl => globalVars.push(decl.id.name));
        symbolSub(x);
        if(x.type==='FunctionDeclaration'){
            removeLocalExpressions(x);
        }
    });
}

function symbolSub(parsedCode){
    let func = commands[parsedCode.type];
    func !== undefined ? commands[parsedCode.type](parsedCode): null;
}

function varDeclarationHandler(parsedCode) {
    let declarations = parsedCode.declarations;
    declarations.map(createVarDeclRow);
}

function createVarDeclRow(x){ //todo: Perhaps didn't handle all cases of init (array expressions)
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
    functionParams = parsedCode.params.map(x=>x.name);
    for(let i=0; i<functionParams.length; i++)
        symbolTable[functionParams[i]] = functionArgs[i];
    symbolSub(parsedCode.body);
}

function expressionHandler(parsedCode) {
    return assignmentExpressionHandler(parsedCode.expression);
}

function assignmentExpressionHandler(parsedCode) {
    if(isIdentifier(parsedCode.left)) {
        if (isIdentifier(parsedCode.right)) {
            symbolTable[parsedCode.left.name] = symbolTable[parsedCode.right.name];
            parsedCode.right = symbolTable[parsedCode.left.name];
        }
        else {
            symbolSub(parsedCode.right);
            symbolTable[parsedCode.left.name] = parsedCode.right;
        }
    }
    else{
        symbolSub(parsedCode.left);
        symbolSub(parsedCode.right);
    }
}

function memberExpressionHandler(parsedCode){
    if(isIdentifier(parsedCode.property))
        parsedCode.property = symbolTable[parsedCode.property.name];
    else
        symbolSub(parsedCode.property);
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
    symbolSub(parsedCode.test);
    symbolSub(parsedCode.consequent);
    if(parsedCode.alternate!==null)
        symbolSub(parsedCode.alternate);
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

function removeLocalExpressions(parsedCode){
    estraverse.replace(parsedCode, {
        enter: function (body) {
            if (body.type === 'ExpressionStatement' && isAssignmentExpr(body.expression)){
                if(canRemoveVar(body))
                    this.remove();
            }
            else if (body.type === 'VariableDeclaration')
                this.remove();
        }
    });
}

function canRemoveVar(x){
    return !(functionParams.includes(x.expression.left.name) || globalVars.includes(x.expression.left.name in globalVars));
}

export {parseCode , symbolSub , symbolTable , extractFunctionArgs , symbolicSubstitution};
