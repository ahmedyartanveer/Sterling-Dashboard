(data) => {
    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    
    // Trigger necessary events for ASP.NET postbacks or validation logic
    const triggerEvents = (element) => {
        if (!element) return;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('keyup', { bubbles: true })); 
        element.dispatchEvent(new Event('blur', { bubbles: true }));  
    };

    // Set value for Select (Dropdown) elements
    const setSelectByText = (element, textToSelect) => {
        if (!element) return;
        
        let found = false;
        for (let i = 0; i < element.options.length; i++) {
            if (element.options[i].text === textToSelect) {
                element.selectedIndex = i;
                found = true;
                break;
            }
        }
        
        if (!found && textToSelect === "") {
            element.selectedIndex = -1;
        }

        triggerEvents(element);
    };

    // Set value for Input (Text) or Textarea elements
    const setInputValue = (element, valueToSet) => {
        if (!element) return;
        element.value = valueToSet;
        triggerEvents(element);
    };

    // ==========================================
    // Determine which form type we're dealing with
    // ==========================================
    const isFormType1 = document.getElementById('ctl00_DataGridQuestions') !== null;
    const isFormType2 = document.getElementById('GridViewPump') !== null;

    // ==========================================
    // MAIN POPULATION LOGIC - FORM TYPE 1
    // ==========================================
    
    if (isFormType1) {
        const table = document.getElementById('ctl00_DataGridQuestions');
        const rows = table ? table.getElementsByTagName('tr') : [];
        
        // Track which rows have been used to avoid duplicate matches
        const usedRowIndices = new Set();

        data.forEach(item => {
            let foundInTable = false;

            // 1. Update Main Data Grid (Questions table)
            if (table) {
                for (let i = 0; i < rows.length; i++) {
                    // Skip if this row was already used
                    if (usedRowIndices.has(i)) {
                        continue;
                    }
                    
                    const row = rows[i];
                    const questionSpan = row.querySelector('span[id$="_txtQuestion"]');

                    if (questionSpan && questionSpan.innerText.trim() === item.name) {
                        foundInTable = true;
                        
                        // Mark this row as used
                        usedRowIndices.add(i);

                        if (item.type === 'select') {
                            const selectBox = row.querySelector('select');
                            setSelectByText(selectBox, item.selected);
                        } else if (item.type === 'text') {
                            const inputBox = row.querySelector('input[type="text"]');
                            setInputValue(inputBox, item.value);
                        }
                        
                        break;
                    }
                }
            }

            // 2. Update Footer Fields (if not found in table)
            if (!foundInTable) {
                if (item.name.includes("OVERALL COMMENTS")) {
                    const commentBox = document.getElementById('ctl01_txtComments');
                    setInputValue(commentBox, item.value);
                }
                else if (item.name.includes("Correction status")) {
                    const correctionBox = document.getElementById('ctl01_drpCorrectionStatus');
                    setSelectByText(correctionBox, item.selected);
                }
                else if (item.name.includes("Fieldwork performed by")) {
                    const fieldWorkBox = document.getElementById('ctl01_drpFieldworkPerformedBy');
                    setSelectByText(fieldWorkBox, item.selected);
                }
            }
        });
    }

    // ==========================================
    // MAIN POPULATION LOGIC - FORM TYPE 2
    // ==========================================
    
    if (isFormType2) {
        const table = document.getElementById('GridViewPump');
        const rows = table ? table.getElementsByTagName('tr') : [];
        
        // Track which rows have been used to avoid duplicate matches
        const usedRowIndices = new Set();

        data.forEach(item => {
            let foundInTable = false;

            // 1. Update Main Data Grid (GridViewPump table)
            if (table) {
                for (let i = 0; i < rows.length; i++) {
                    // Skip if this row was already used
                    if (usedRowIndices.has(i)) {
                        continue;
                    }
                    
                    const row = rows[i];
                    const cells = row.getElementsByTagName('td');
                    
                    if (cells.length >= 2) {
                        const firstCell = cells[0];
                        const questionText = firstCell.innerText.trim();

                        if (questionText === item.name) {
                            foundInTable = true;
                            
                            // Mark this row as used
                            usedRowIndices.add(i);
                            
                            const secondCell = cells[1];

                            // Set value in second cell
                            if (item.type === 'select') {
                                const selectBox = secondCell.querySelector('select');
                                setSelectByText(selectBox, item.selected);
                            } else if (item.type === 'text') {
                                const inputBox = secondCell.querySelector('input[type="text"]');
                                setInputValue(inputBox, item.value);
                            }

                            // Handle fields array (third cell / last td)
                            if (item.fields && item.fields.length > 0 && cells.length >= 3) {
                                const lastCell = cells[cells.length - 1];
                                
                                item.fields.forEach(field => {
                                    if (field.type === 'select') {
                                        const lastCellSelect = lastCell.querySelector('select:not([disabled])');
                                        if (lastCellSelect) {
                                            setSelectByText(lastCellSelect, field.selected);
                                        }
                                    } else if (field.type === 'text') {
                                        const lastCellInput = lastCell.querySelector('input[type="text"]:not([disabled])');
                                        if (lastCellInput) {
                                            setInputValue(lastCellInput, field.value);
                                        }
                                    }
                                });
                            }

                            break;
                        }
                    }
                }
            }

            // 2. Update Footer Fields (if not found in table)
            if (!foundInTable) {
                if (item.name.includes("OVERALL COMMENTS")) {
                    const commentBox = document.getElementById('txtComments');
                    setInputValue(commentBox, item.value);
                }
                else if (item.name.includes("Correction status")) {
                    const correctionBox = document.getElementById('drpCorrectionStatus');
                    setSelectByText(correctionBox, item.selected);
                }
                else if (item.name.includes("Fieldwork performed by")) {
                    const fieldWorkBox = document.getElementById('txtFieldworkPerformedBy');
                    setInputValue(fieldWorkBox, item.value);
                }
                else if (item.name.includes("Proposed dump location") && item.name.includes("State")) {
                    const stateBox = document.getElementById('drpState');
                    setSelectByText(stateBox, item.selected);
                }
                else if (item.name.includes("Dump Location Detail")) {
                    const dumpLocationBox = document.getElementById('drpDumpLocation');
                    setSelectByText(dumpLocationBox, item.selected);
                }
            }
        });
    }
}