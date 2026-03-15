// This is a test.

function testEveryRule() {
    
    // 1. Testing Switch
    switch (true) {
        case 1:
            // 2. Testing If & Else
            if (false) {
                console.log("Testing if");
            } else {
                console.log("Testing else (should get +1, but no nesting penalty)");
            }
            break;
    }

    // 3. Testing Try/Catch
    try {
        // 4. Testing For Loop
        for (let i = 0; i < 5; i++) {
            
            // 5. Testing While Loop deeper inside
            while (i < 2) {
                console.log("Testing while loop");
            }
        }
    } catch (e) {
        console.log("Testing catch block");
    }
}

// This is a test comment. The scanner should ignore it and score it 0.

function testEveryRule() {
    
    // 1. Testing Switch
    switch (true) {
        case 1:
            // 2. Testing If & Else
            if (false) {
                console.log("Testing if");
            } else {
                console.log("Testing else (should get +1, but no nesting penalty)");
            }
            break;
    }

    // 3. Testing Try/Catch
    try {
        // 4. Testing For Loop
        for (let i = 0; i < 5; i++) {
            
            // 5. Testing While Loop deeper inside
            while (i < 2) {
                console.log("Testing while loop");
            }
        }
    } catch (e) {
        console.log("Testing catch block");
    }
}
// This is a test comment. The scanner should ignore it and score it 0.

function testEveryRule() {
    
    // 1. Testing Switch
    switch (true) {
        case 1:
            // 2. Testing If & Else
            if (false) {
                console.log("Testing if");
            } else {
                console.log("Testing else (should get +1, but no nesting penalty)");
            }
            break;
    }

    // 3. Testing Try/Catch
    try {
        // 4. Testing For Loop
        for (let i = 0; i < 5; i++) {
            
            // 5. Testing While Loop deeper inside
            while (i < 2) {
                console.log("Testing while loop");
            }
        }
    } catch (e) {
        console.log("Testing catch block");
    }
}// This is a test comment. The scanner should ignore it and score it 0.

