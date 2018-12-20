import * as esprima from 'esprima';
import * as estraverse from 'estraverse';
import * as escodegen from 'escodegen';

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};

let commands = {'VariableDeclaration' : varDeclarationHandler , 'FunctionDeclaration': functionHandler ,
    'WhileStatement': whileHandler , 'IfStatement': ifHandler , 'BlockStatement': blockHandler ,
    'ExpressionStatement': expressionHandler, 'AssignmentExpression':assignmentExpressionHandler ,
    'BinaryExpression': binaryExpressionHandler , 'MemberExpression': memberExpressionHandler  ,
    'ReturnStatement':returnHandler , 'Identifier': identifierHandler};

let symbolTable = {};
let functionArgs = [];
let functionParams = [];
let globalVars = [];
let functionSymbolTable = {};

let toPaint = [];

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

function symbolicSubstitution(parsedCode , args){
    symbolTable = {};
    functionParams = [];
    globalVars = [];
    extractFunctionArgs(args);
    parsedCode.body.map(x => {
        if (x.type === 'Variable Declaration')
            x.declarations.map(decl => globalVars.push(decl.id.name));
        symbolSub(x);
        if(x.type==='FunctionDeclaration'){
            removeLocalExpressions(x);
        }
    });
    let newParsedCode = parseCode(escodegen.generate(parsedCode));
    toPaint = getColoringLocations(newParsedCode);
}

function symbolSub(parsedCode){
    let func = commands[parsedCode.type];
    func !== undefined ? commands[parsedCode.type](parsedCode): null;
}

function identifierHandler(parsedCode) {
    let ret = symbolTable[parsedCode.name];
    let flag = 0;
    if(ret!==undefined) {
        while (flag===0 && isIdentifier(ret))
            symbolTable[ret.name] !== undefined ? ret = symbolTable[ret.name] : flag = 1;
        return ret;
    }
}

function varDeclarationHandler(parsedCode) {
    let declarations = parsedCode.declarations;
    declarations.map(createVarDeclRow);
}

function createVarDeclRow(x){
    if(!isIdentifier(x.init)) {
        symbolSub(x.init);
        symbolTable[x.id.name] = x.init;
    }
    else {
        if(symbolTable[x.init.name]!==undefined) {
            symbolTable[x.id.name] = symbolTable[x.init.name];
            x.init = symbolTable[x.id.name];
        }
        else
            symbolTable[x.id.name] = x.init;
    }
}

function isIdentifier(x){
    return x.type === 'Identifier';
}

function functionHandler(parsedCode) {
    functionSymbolTable = {};
    functionParams = parsedCode.params.map(x=>x.name);
    for(let i=0; i<functionParams.length; i++)
        functionSymbolTable[functionParams[i]] = functionArgs[i];
    symbolSub(parsedCode.body);
}

function expressionHandler(parsedCode) {
    return assignmentExpressionHandler(parsedCode.expression);
}

function assignmentExpressionHandler(parsedCode) {
    if(isIdentifier(parsedCode.left) && symbolTable[parsedCode.left.name]!==undefined) {
        extractAssignmentHandler(parsedCode , symbolTable);
    }
    else if(isIdentifier(parsedCode.left) && functionSymbolTable[parsedCode.left.name]!==undefined){
        extractAssignmentHandler(parsedCode , functionSymbolTable);
    }
    else{
        symbolSub(parsedCode.left);
        symbolSub(parsedCode.right);
    }
}

function extractAssignmentHandler(parsedCode , symTbl) {
    if (isIdentifier(parsedCode.right)) {
        if(symbolTable[parsedCode.right.name]!==undefined)
            symTbl[parsedCode.left.name] = symbolTable[parsedCode.right.name];
        else
            symTbl[parsedCode.left.name] = parsedCode.right;
        parsedCode.right = symTbl[parsedCode.left.name];
    }
    else {
        symbolSub(parsedCode.right);
        symTbl[parsedCode.left.name] = parsedCode.right;
    }
}

function memberExpressionHandler(parsedCode){
    if(isIdentifier(parsedCode.property)) {
        if(symbolTable[parsedCode.property.name]!==undefined)
            parsedCode.property = symbolTable[parsedCode.property.name];
    }
    else
        symbolSub(parsedCode.property);
}

function binaryExpressionHandler(parsedCode){
    if(isIdentifier(parsedCode.left)){
        let leftExpr = identifierHandler(parsedCode.left);
        if(leftExpr!==undefined)
            parsedCode.left = leftExpr;
    }
    else
        symbolSub(parsedCode.left);

    if(isIdentifier(parsedCode.right)){
        let rightExpr = identifierHandler(parsedCode.right);
        if(rightExpr!==undefined)
            parsedCode.right = rightExpr;
    }
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
    if(isIdentifier(parsedCode.argument) && !(functionParams.includes(parsedCode.argument.name)))
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

function getColoringLocations(parsedCode) {
    symbolTable =  Object.assign({}, symbolTable, functionSymbolTable);
    functionSymbolTable = {};
    let locs = [];
    estraverse.traverse(parsedCode , {
        enter: function (body) {
            if (body.type === 'IfStatement') {
                symbolSub(body.test);
                locs.push([body.loc.start.line - 1, eval(escodegen.generate(body.test)) ? true : false]);
            }
        }
    });
    return locs;
}

function canRemoveVar(x){
    return !(functionParams.includes(x.expression.left.name) || globalVars.includes(x.expression.left.name in globalVars));
}

export {parseCode , symbolSub , symbolTable , extractFunctionArgs , symbolicSubstitution , toPaint};


