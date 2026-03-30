# Developer Cognitive Load Tracker

Writing complex code or staring at a file for too long can silently drain your energy. Flow-State's Developer Cognitive Load Tracker acts as your safety net.

Behind the scenes, it keeps an eye on:
- **Code Complexity:** Alerts you if a single file crosses a cognitive complexity score of 15, meaning it might be time to refactor.
- **Reading vs. Writing:** Detects if you've been stuck reading code without typing for more than 15 minutes.
- **Deletion Ratios:** Notices if you are heavily adding and deleting code.
- **Large Insertions:** Warns you if you paste massive chunks of code (over 600 characters) at once, such as AI-generated blocks, which drastically increases the mental load required to comprehend it.