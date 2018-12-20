import assert from 'assert';
import {parseCode, symbolicSubstitution} from '../src/js/code-analyzer';
import * as escodegen from 'escodegen';

describe('Symbol substitution', () => {
    it('is creating correct replaced code for a non-function program', () => {
        let parsedCode = parseCode('let x = 1;\n' +
            'let y = 2;\n' +
            'let z = x + y;');
        symbolicSubstitution(parsedCode, '');
        assert.equal(
            escodegen.generate(parsedCode),
            'let x = 1;\n' +
            'let y = 2;\n' +
            'let z = 1 + 2;'
        );
    });

    it('is creating correct replaced code for a simple function program', () => {
        let parsedCode = parseCode('function foo(x , y){\n' +
            ' let i = 0;\n' +
            ' let j = 0;\n' +
            ' i = y;\n' +
            '}');
        symbolicSubstitution(parsedCode, '"x" , true');
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(x, y) {\n' +
            '}'
        );
    });

    /*it('is creating correct replaced code for a simple function with one global var', () => {
        let parsedCode = parseCode('let x = 1;\n' +
            'function f(a , b){\n' +
            ' let k = b;\n' +
            ' return a + k;\n' +
            '}');
        symbolicSubstitution(parsedCode , 'true , false');
        assert.equal(
            escodegen.generate(parsedCode),
            'let x = 1;\n' +
            'function f(a, b) {\n' +
            'return a + b;\n' +
            '}'
        );
    });*/

    it('is creating correct replaced code for a simple Member Expression', () => {
        let parsedCode = parseCode('let x = 3;\n' +
            'M[x] = 6;');
        symbolicSubstitution(parsedCode , '');
        assert.equal(
            escodegen.generate(parsedCode),
            'let x = 3;\n' +
            'M[3] = 6;'
        );
    });

    it('is creating correct replaced code for a member expression + simple function with no parameters', () => {
        let parsedCode = parseCode('let i = 7;\n' +
            'let j = 12;\n' +
            'function goo(){\n' +
            ' arr[i+j] = i*j;\n' +
            ' return true;\n' +
            '}');
        symbolicSubstitution(parsedCode , '');
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
        let parsedCode = parseCode('function foo(a , b , c , d){\n' +
            ' let x = (a + b)*c;\n' +
            ' if(x>d){\n' +
            '   return x;\n' +
            ' }\n' +
            '}');
        symbolicSubstitution(parsedCode , '1 , 2 , 3 , 4');
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(a, b, c, d) {\n' +
            '    if ((a + b) * c > d) {\n' +
            '        return (a + b) * c;\n' +
            '    }\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a simple function with more than one argument #2', () => {
        let parsedCode = parseCode('function foo(a , b){\n' +
            ' let x = 2*a;\n' +
            ' while(x > b){\n' +
            '   a = a-1;\n' +
            ' }\n' +
            '}');
        symbolicSubstitution(parsedCode , '3 , 4');
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(a, b) {\n' +
            '    while (2 * a > b) {\n' +
            '        a = a - 1;\n' +
            '    }\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a simple function with many declarations', () => {
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
        symbolicSubstitution(parsedCode , 'true , "bla"');
        assert.equal(
            escodegen.generate(parsedCode),
            'function foo(a, b) {\n' +
            '    b = a;\n' +
            '    if (a === a)\n' +
            '        return \'yay!\';\n' +
            '    else\n' +
            '        return \'oof\';\n' +
            '}'
        );
    });

    it('is creating correct replaced code for a complex binary expression', () => {
        let parsedCode = parseCode('function f(a){\n' +
            ' let x = a*a;\n' +
            ' let y = a+a;\n' +
            ' a = x + y;\n' +
            '}');
        symbolicSubstitution(parsedCode , '10');
        assert.equal(
            escodegen.generate(parsedCode),
            'function f(a) {\n' +
            '    a = a * a + (a + a);\n' +
            '}'
        );
    });

});
