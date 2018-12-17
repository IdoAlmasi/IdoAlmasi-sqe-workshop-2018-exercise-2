import assert from 'assert';
import {extractFunctionArgs, parseCode, symbolicSubstitution, symbolTable} from '../src/js/code-analyzer';
import * as escodegen from 'escodegen';

describe('Symbol substitution', () => {
    it('is creating a correct symbol table for a non-function program', () => {
        extractFunctionArgs('');
        symbolicSubstitution(parseCode('let x = 1;\n' +
            'let y = 2;\n' +
            'let z = x + y;'));
        assert.equal(
            JSON.stringify(symbolTable),
            '{"x":{"type":"Literal","value":1,"raw":"1"},"y":{"type":"Literal","value":2,"raw":"2"},"z":{"type":"BinaryExpression","operator":"+","left":{"type":"Literal","value":1,"raw":"1"},"right":{"type":"Literal","value":2,"raw":"2"}}}'
        );
    });

    it('is creating a correct symbol table for a simple function program', () => {
        extractFunctionArgs('"x" , true');
        symbolicSubstitution(parseCode('function foo(x , y){\n' +
                ' let i = 0;\n' +
                ' let j = 0;\n' +
                ' i = y;\n' +
                '}'));
        assert.equal(
            JSON.stringify(symbolTable),
            '{"x":{"type":"Literal","value":"x","raw":"\\"x\\""},' +
            '"y":{"type":"Literal","value":true,"raw":"true"},' +
            '"i":{"type":"Literal","value":true,"raw":"true"},' +
            '"j":{"type":"Literal","value":0,"raw":"0"}}'
        );
    });

    it('is creating correct replaced code for a simple function with one global var', () => {
        extractFunctionArgs('true , false');
        let parsedCode = parseCode('let x = 1;\n' +
            'function f(a , b){\n' +
            ' let k = b;\n' +
            ' return a + k;\n' +
            '}');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'let x = 1;\n' +
            'function f(a, b) {\n' +
            '    return true + false;\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a simple Member Expression', () => {
        extractFunctionArgs('');
        let parsedCode = parseCode('let x = 3;\n' +
            'M[x] = 6;');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'let x = 3;\n' +
            'M[3] = 6;'
        );
    });

    it('is creating correct replaced code for a member expression + simple function with no parameters', () => {
        extractFunctionArgs('');
        let parsedCode = parseCode('let i = 7;\n' +
            'let j = 12;\n' +
            'function goo(){\n' +
            ' arr[i+j] = i*j;\n' +
            ' return true;\n' +
            '}');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'let i = 7;\n' +
            'let j = 12;\n' +
            'function goo() {\n' +
            '    return true;\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a simple function with more than one argument', () => {
        extractFunctionArgs('1 , 2 , 3 , 4');
        let parsedCode = parseCode('function foo(a , b , c , d){\n' +
            ' let x = (a + b)*c;\n' +
            ' if(x>d){\n' +
            '   return x;\n' +
            ' }\n' +
            '}');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(a, b, c, d) {\n' +
            '    if ((1 + 2) * 3 > 4) {\n' +
            '        return (1 + 2) * 3;\n' +
            '    }\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a simple function with more than one argument #2', () => {
        extractFunctionArgs('3 , 4');
        let parsedCode = parseCode('function foo(a , b){\n' +
            ' let x = 2*a;\n' +
            ' while(x > b){\n' +
            '   a = a-1;\n' +
            ' }\n' +
            '}');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(a, b) {\n' +
            '    while (2 * 3 > 4) {\n' +
            '        a = 3 - 1;\n' +
            '    }\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a simple function with many declarations', () => {
        extractFunctionArgs('true , "bla"');
        let parsedCode = parseCode('function foo(a , b){\n' +
            ' let x = a;\n' +
            ' let y = x;\n' +
            ' let z = y;\n' +
            ' b = z;\n' +
            ' if(z === a)\n' +
            '  return \'yay!\'\n' +
            ' else\n' +
            '  return \'oof\'\n' +
            '}');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(a, b) {\n' +
            '    b = true;\n' +
            '    if (true === true)\n' +
            '        return \'yay!\';\n' +
            '    else\n' +
            '        return \'oof\';\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a complex binary expression', () => {
        extractFunctionArgs('10');
        let parsedCode = parseCode('function f(a){\n' +
            ' let x = a*a;\n' +
            ' let y = a+a;\n' +
            ' a = x + y;\n' +
            '}');
        symbolicSubstitution(parsedCode);
        assert.equal(
            escodegen.generate(parsedCode),
            'function f(a) {\n' +
            '    a = 10 * 10 + (10 + 10);\n' +
            '}'
        );
    });

});
