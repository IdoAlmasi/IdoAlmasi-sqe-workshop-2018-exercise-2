import $ from 'jquery';
import {symbolSub, parseCode, symbolTable , extractFunctionArgs , symbolicSubstitution} from './code-analyzer';
import * as escodegen from 'escodegen';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let args = $('#parameterInput').val();
        let codeToSub = parseCode(codeToParse);
        extractFunctionArgs(args);
        symbolicSubstitution(codeToSub);
        $('#parsedCode').val(escodegen.generate(codeToSub));
    });
});
