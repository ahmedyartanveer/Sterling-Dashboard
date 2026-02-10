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

                    const cells = row.getElementsByTagName('td');
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

                    // Extract status from third column (last td)
                    if (cells.length >= 3) {
                        const statusCell = cells[2];
                        const statusSelect = statusCell.querySelector('select');
                        const statusInput = statusCell.querySelector('input[type="text"]');
                        const statusSpan = statusCell.querySelector('span');
                        
                        if (statusSelect && !statusSelect.disabled) {
                            // If select exists and not disabled, get selected value
                            if (statusSelect.selectedIndex >= 0) {
                                item.status = statusSelect.options[statusSelect.selectedIndex].text;
                            } else {
                                item.status = "";
                            }
                        } else if (statusInput && !statusInput.disabled) {
                            // If text input exists and not disabled, get value
                            item.status = statusInput.value.trim();
                        } else if (statusSpan) {
                            // If span exists, get its text content
                            item.status = statusSpan.innerText.trim();
                        } else {
                            // If disabled or empty, set to empty string
                            item.status = "";
                        }
                    } else {
                        item.status = "";
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
                "value": commentsBox.value,
                "status": ""
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
                "selected": "",
                "status": ""
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
                "selected": "",
                "status": ""
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

                        // Check for select element
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

                        // Extract status from third column (last td)
                        if (cells.length >= 3) {
                            const statusCell = cells[2];
                            const statusSelect = statusCell.querySelector('select');
                            const statusInput = statusCell.querySelector('input[type="text"]');
                            const statusSpan = statusCell.querySelector('span');
                            
                            if (statusSelect && !statusSelect.disabled) {
                                // If select exists and not disabled, get selected value
                                if (statusSelect.selectedIndex >= 0) {
                                    item.status = statusSelect.options[statusSelect.selectedIndex].text;
                                } else {
                                    item.status = "";
                                }
                            } else if (statusInput && !statusInput.disabled) {
                                // If text input exists and not disabled, get value
                                item.status = statusInput.value.trim();
                            } else if (statusSpan) {
                                // If span exists, get its text content
                                item.status = statusSpan.innerText.trim();
                            } else {
                                // If disabled or empty, set to empty string
                                item.status = "";
                            }
                        } else {
                            item.status = "";
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
                "value": commentsBox2.value,
                "status": ""
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
                "selected": "",
                "status": ""
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
                "value": fieldworkInput.value.trim(),
                "status": ""
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
                "selected": "",
                "status": ""
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
                "selected": "",
                "status": ""
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