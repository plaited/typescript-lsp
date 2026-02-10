# Skill Activation

**Evaluate before implementing** - Check available skills for relevance before starting work

**Activation sequence:**

1. **Evaluate** - For each skill in `<available_skills>`, assess: `[skill-name] - YES/NO - [reason]`
2. **Activate** - Call `Skill(skill-name)` for each relevant skill before proceeding
3. **Implement** - Begin work only after activation is complete

*Verify:* Did you check available skills before starting implementation?
*Fix:* Pause, evaluate skills, activate relevant ones, then continue

**Example:**
```
- code-patterns: NO - not writing code
- git-workflow: YES - need commit conventions
- documentation: YES - writing README

> Skill(git-workflow)
> Skill(documentation)
```

**Activation before implementation** - Evaluating skills without calling `Skill()` provides no benefit
*Verify:* Check that `Skill()` was called for each YES evaluation
*Fix:* Call `Skill(skill-name)` for skipped activations
