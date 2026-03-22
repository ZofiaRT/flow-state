# Protect Reviewers from Fatigue

Burnout doesn't just happen while writing code; it happens while reviewing it. 

Flow-State includes a **Reviewer Cognitive Load Tracker** that analyzes your staged Git files before you submit a Pull Request. By default, it will trigger a Reviewer Fatigue warning if your PR modifies more than 400 Lines of Code (LOC), has zombie packages or its complexity score is above 15.

You can also run this check manually at any time!

[Analyze PR (Reviewer Load)](command:flow-state.analyzePR)