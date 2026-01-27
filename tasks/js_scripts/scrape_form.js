() => {
    const resultData = [];

    // ==========================================
    // PART 1: Main Data Grid (Questions table)
    // ==========================================
    const table = document.getElementById('ctl00_DataGridQuestions');
    if (table) {
        const rows = table.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Find the question span element
            const questionSpan = row.querySelector('span[id$="_txtQuestion"]');
            
            if (questionSpan) {
                const item = {
                    "type": "", 
                    "name": questionSpan.innerText.trim(),
                };

                const selectElement = row.querySelector('select');
                const inputElement = row.querySelector('input[type="text"]');

                if (selectElement) {
                    item.type = "select";
                    item.options = [];
                    
                    // Collect all options
                    for (let j = 0; j < selectElement.options.length; j++) {
                        item.options.push(selectElement.options[j].text);
                    }
                    
                    // Get selected value
                    if (selectElement.selectedIndex >= 0) {
                        item.selected = selectElement.options[selectElement.selectedIndex].text;
                    } else {
                        item.selected = "";
                    }
                } else if (inputElement) {
                    item.type = "text";
                    item.value = inputElement.value.trim();
                }

                resultData.push(item);
            }
        }
    }

    // ==========================================
    // PART 2: Footer Fields
    // ==========================================

    // 1. OVERALL COMMENTS (TextArea)
    const commentsBox = document.getElementById('ctl01_txtComments');
    if (commentsBox) {
        // Find comment label (class: logintitlefont)
        const commentLabel = document.querySelector('.logintitlefont');
        const labelText = commentLabel ? commentLabel.innerText.trim() : "OVERALL COMMENTS";

        resultData.push({
            "type": "textarea",
            "name": labelText,
            "value": commentsBox.value 
        });
    }

    // 2. Correction Status (Select)
    const correctionSelect = document.getElementById('ctl01_drpCorrectionStatus');
    if (correctionSelect) {
        const lbl1 = document.getElementById('ctl01_lblCorrectionStatus');
        const lbl2 = document.getElementById('ctl01_Label2');
        const fullLabel = (lbl1 ? lbl1.innerText : "") + " " + (lbl2 ? lbl2.innerText : "");

        const correctionItem = {
            "type": "select",
            "name": fullLabel.trim(),
            "options": [],
            "selected": ""
        };

        for (let k = 0; k < correctionSelect.options.length; k++) {
            correctionItem.options.push(correctionSelect.options[k].text);
        }
        if (correctionSelect.selectedIndex >= 0) {
            correctionItem.selected = correctionSelect.options[correctionSelect.selectedIndex].text;
        }
        resultData.push(correctionItem);
    }

    // 3. Fieldwork performed by (Select)
    const fieldworkSelect = document.getElementById('ctl01_drpFieldworkPerformedBy');
    if (fieldworkSelect) {
        const fwLabel = document.getElementById('ctl01_lblInspectedBy');
        
        const fwItem = {
            "type": "select",
            "name": fwLabel ? fwLabel.innerText.trim() : "Fieldwork performed by:",
            "options": [],
            "selected": ""
        };

        for (let m = 0; m < fieldworkSelect.options.length; m++) {
            fwItem.options.push(fieldworkSelect.options[m].text);
        }
        if (fieldworkSelect.selectedIndex >= 0) {
            fwItem.selected = fieldworkSelect.options[fieldworkSelect.selectedIndex].text;
        }
        resultData.push(fwItem);
    }

    return resultData;
}