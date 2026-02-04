() => {
    const resultData = [];

    // ==========================================
    // Determine which form type we're dealing with
    // ==========================================
    const isFormType1 = document.getElementById('ctl00_DataGridQuestions') !== null;
    const isFormType2 = document.getElementById('GridViewPump') !== null;

    // ==========================================
    // PART 1: Main Data Grid (Questions table)
    // ==========================================
    
    // For Form Type 1
    if (isFormType1) {
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

        // Form Type 1 Footer Fields
        // 1. OVERALL COMMENTS (TextArea)
        const commentsBox = document.getElementById('ctl01_txtComments');
        if (commentsBox) {
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
    }
    
    // For Form Type 2
    if (isFormType2) {
        const table = document.getElementById('GridViewPump');
        if (table) {
            const rows = table.getElementsByTagName('tr');

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                
                if (cells.length >= 2) {
                    const firstCell = cells[0];
                    const secondCell = cells[1];
                    
                    // Get question text from first cell
                    const questionText = firstCell.innerText.trim();
                    
                    if (questionText) {
                        const item = {
                            "type": "",
                            "name": questionText,
                        };

                        // Check for select element in second cell
                        const selectElement = secondCell.querySelector('select');
                        const inputElement = secondCell.querySelector('input[type="text"]');

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

                        // NEW: Check if there's a third cell (last td) with additional fields
                        if (cells.length >= 3 && item.type) {
                            const lastCell = cells[cells.length - 1];
                            const lastCellSelect = lastCell.querySelector('select');
                            const lastCellInput = lastCell.querySelector('input[type="text"]');
                            
                            // Check if field exists and is NOT disabled
                            if (lastCellSelect && !lastCellSelect.disabled) {
                                item.fields = [];
                                
                                const fieldItem = {
                                    "type": "select",
                                    "options": [],
                                    "selected": ""
                                };
                                
                                // Collect all options
                                for (let k = 0; k < lastCellSelect.options.length; k++) {
                                    fieldItem.options.push(lastCellSelect.options[k].text);
                                }
                                
                                // Get selected value
                                if (lastCellSelect.selectedIndex >= 0) {
                                    fieldItem.selected = lastCellSelect.options[lastCellSelect.selectedIndex].text;
                                }
                                
                                item.fields.push(fieldItem);
                            } else if (lastCellInput && !lastCellInput.disabled) {
                                item.fields = [];
                                
                                const fieldItem = {
                                    "type": "text",
                                    "value": lastCellInput.value.trim()
                                };
                                
                                item.fields.push(fieldItem);
                            }
                        }

                        // Only add if we found an input type
                        if (item.type) {
                            resultData.push(item);
                        }
                    }
                }
            }
        }

        // Form Type 2 Footer Fields
        // 1. OVERALL COMMENTS (TextArea)
        const commentsBox2 = document.getElementById('txtComments');
        if (commentsBox2) {
            resultData.push({
                "type": "textarea",
                "name": "OVERALL COMMENTS: Provide additional or clarifying information regarding any observed deficiencies or status of the system",
                "value": commentsBox2.value 
            });
        }

        // 2. Correction Status (Select)
        const correctionSelect2 = document.getElementById('drpCorrectionStatus');
        if (correctionSelect2) {
            const lblCorrection = document.getElementById('lblCorrectionStatus');
            
            const correctionItem = {
                "type": "select",
                "name": lblCorrection ? lblCorrection.innerText.trim() : "Correction status:",
                "options": [],
                "selected": ""
            };

            for (let k = 0; k < correctionSelect2.options.length; k++) {
                correctionItem.options.push(correctionSelect2.options[k].text);
            }
            if (correctionSelect2.selectedIndex >= 0) {
                correctionItem.selected = correctionSelect2.options[correctionSelect2.selectedIndex].text;
            }
            resultData.push(correctionItem);
        }

        // 3. Fieldwork performed by (Text Input for Type 2)
        const fieldworkInput = document.getElementById('txtFieldworkPerformedBy');
        if (fieldworkInput) {
            const lblFieldwork = document.getElementById('lblFieldworkPerformedBy');
            
            resultData.push({
                "type": "text",
                "name": lblFieldwork ? lblFieldwork.innerText.trim() : "Fieldwork performed by:",
                "value": fieldworkInput.value.trim()
            });
        }

        // 4. Proposed dump location (Select - State)
        const stateSelect = document.getElementById('drpState');
        if (stateSelect) {
            const lblDumpLocation = document.getElementById('Label1');
            
            const stateItem = {
                "type": "select",
                "name": (lblDumpLocation ? lblDumpLocation.innerText.trim() : "Proposed dump location:") + " (State)",
                "options": [],
                "selected": ""
            };

            for (let k = 0; k < stateSelect.options.length; k++) {
                stateItem.options.push(stateSelect.options[k].text);
            }
            if (stateSelect.selectedIndex >= 0) {
                stateItem.selected = stateSelect.options[stateSelect.selectedIndex].text;
            }
            resultData.push(stateItem);
        }

        // 5. Dump Location Detail (Select)
        const dumpLocationSelect = document.getElementById('drpDumpLocation');
        if (dumpLocationSelect) {
            const dumpItem = {
                "type": "select",
                "name": "Dump Location Detail",
                "options": [],
                "selected": ""
            };

            for (let k = 0; k < dumpLocationSelect.options.length; k++) {
                dumpItem.options.push(dumpLocationSelect.options[k].text);
            }
            if (dumpLocationSelect.selectedIndex >= 0) {
                dumpItem.selected = dumpLocationSelect.options[dumpLocationSelect.selectedIndex].text;
            }
            resultData.push(dumpItem);
        }
    }

    return resultData;
}