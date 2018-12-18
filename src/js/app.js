import $ from 'jquery';
import {symbolSub, parseCode, symbolTable, symbolicSubstitution, toPaint} from './code-analyzer';
import * as escodegen from 'escodegen';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let args = $('#parameterInput').val();
        let codeToSub = parseCode(escodegen.generate(parseCode(codeToParse)));
        symbolicSubstitution(codeToSub , args);
        paintStatements(codeToSub);
        //$('#parsedCode').val(escodegen.generate(codeToSub));
    });
});

function paintStatements(codeToParse) {
    let htmlCode='';
    let parsedCodeArr = escodegen.generate(codeToParse).split('\n');
    for(let i=0; i<parsedCodeArr.length ; i++){
        let color = 'white';
        for(let j = 0; j<toPaint.length ; j++){
            if(toPaint[j][0] === i)
                color = toPaint[j][1]===true ? 'green' : 'red';
        }
        htmlCode += '<div style = "background-color: '+ color + '">'+parsedCodeArr[i]+' </div>';
    }
    document.body.innerHTML = htmlCode;
}
