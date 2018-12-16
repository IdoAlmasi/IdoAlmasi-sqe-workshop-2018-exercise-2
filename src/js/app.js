import $ from 'jquery';
import {symbolSub, parseCode, symbolTable , extractFunctionArgs} from './code-analyzer';
import * as escodegen from 'escodegen';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let args = $('#parameterInput').val();
        let codeToSub = parseCode(codeToParse);
        extractFunctionArgs(args);
        symbolSub(codeToSub);
        $('#parsedCode').val(escodegen.generate(codeToSub));
    });
});
