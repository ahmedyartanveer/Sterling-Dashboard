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
    // MAIN POPULATION LOGIC
    // ==========================================
    
    const table = document.getElementById('ctl00_DataGridQuestions');
    const rows = table ? table.getElementsByTagName('tr') : [];

    data.forEach(item => {
        let foundInTable = false;

        // 1. Update Main Data Grid (Questions table)
        if (table) {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const questionSpan = row.querySelector('span[id$="_txtQuestion"]');

                if (questionSpan && questionSpan.innerText.trim() === item.name) {
                    foundInTable = true;

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