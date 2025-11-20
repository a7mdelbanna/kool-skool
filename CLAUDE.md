# Claude Agent System - Instructions

## 🚀 Quick Start

This project uses a multi-agent system for efficient parallel development. Each agent specializes in specific aspects of development.

## 🗄️ CRITICAL: Database Architecture (READ THIS FIRST!)

### ⚠️ WE USE FIREBASE, NOT SUPABASE!

**EXTREMELY IMPORTANT**: This project uses **Firebase/Firestore** as the database backend.

**Supabase was the OLD database and is NO LONGER USED!**

If you create SQL migration files or assume Supabase is connected, you are making a critical architectural error.

### SupabaseToFirebase Compatibility Layer

To maintain code structure during migration from Supabase to Firebase, a compatibility layer exists:

**Key Files**:
- `/src/services/migration/supabaseToFirebase.ts` - The compatibility layer implementation
- `/src/integrations/supabase/client.ts` - Re-exports the Firebase migration layer as `supabase`

**How It Works**:
1. Code uses Supabase-style syntax: `supabase.from('table').select().eq('field', 'value')`
2. The `SupabaseQueryBuilder` class translates these method chains into Firebase/Firestore operations
3. RPC calls (`supabase.rpc('function_name', params)`) are mapped to handler functions via switch statement
4. The `mapTableName()` function maps Supabase table names to Firebase collection names
5. Responses follow Supabase format: `{ data, error }` for consistency

**Example Code Flow**:
```typescript
// You write:
const { data, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('student_id', studentId);

// The compatibility layer:
// 1. Maps 'subscriptions' → Firebase collection name
// 2. Builds Firebase query with .where('student_id', '==', studentId)
// 3. Executes query and returns { data, error }
```

### Adding New Database Features

**DO** ✅:
- Use `supabase.from(tableName)` syntax - it's automatically mapped to Firebase queries
- Add new RPC handlers in `/src/services/migration/supabaseToFirebase.ts` for complex operations
- Update TypeScript interfaces in `/src/integrations/supabase/client.ts` for type safety
- Remember: Firestore is schemaless - schema changes happen through code, not migrations
- Use the `databaseService` from `@/services/firebase/database.service` for direct Firebase operations when needed

**DON'T** ❌:
- Create SQL migration files in `/supabase/migrations/` - they won't work with Firebase!
- Assume Supabase is actually connected - it's not!
- Try to run PostgreSQL/SQL commands
- Forget to implement RPC handlers for new RPC function calls

### RPC Function Implementation Pattern

When you need a new RPC function:

1. **Add case to switch statement** in `/src/services/migration/supabaseToFirebase.ts`:
```typescript
rpc: async (functionName: string, params?: any) => {
  switch (functionName) {
    // ... existing cases
    case 'your_new_function':
      return handleYourNewFunction(params);
    default:
      console.warn(`RPC function ${functionName} not implemented`);
      return { data: null, error: new Error('Function not implemented') };
  }
}
```

2. **Implement handler function** using Firebase operations:
```typescript
async function handleYourNewFunction(params: any) {
  try {
    // Use databaseService or Firebase SDK directly
    const result = await databaseService.getDocument('collection', params.id);
    return { data: result, error: null };
  } catch (error) {
    console.error('Error in handleYourNewFunction:', error);
    return { data: null, error };
  }
}
```

3. **Return Supabase-compatible format**: Always return `{ data, error }` structure

### Database Collections Structure

Firebase collections used in this project:
- `students` - Student records
- `subscriptions` - Student subscriptions (individual, group, trial)
- `sessions` - Lesson sessions
- `schools` - School/organization data
- `teachers` - Teacher profiles
- `groups` - Group lesson information
- `users` - User authentication and profiles

### ⚠️ Firestore Query Limitations (CRITICAL!)

**Firestore requires composite indexes for complex queries!**

Unlike PostgreSQL/Supabase which auto-creates indexes, Firestore requires manual index creation for:

1. **Multiple field filters + inequality/orderBy**
   ```typescript
   // ❌ REQUIRES COMPOSITE INDEX
   .eq('field1', value1)
   .eq('field2', value2)
   .neq('field3', value3)  // Inequality!

   // ✅ WORKAROUND: Filter in memory
   .eq('field1', value1)
   .eq('field2', value2)
   // Then: data.filter(item => item.field3 !== value3)
   ```

2. **Multiple orderBy clauses**
   ```typescript
   // ❌ REQUIRES COMPOSITE INDEX
   .orderBy('field1')
   .orderBy('field2')
   ```

**When You See "The query requires an index" Error:**

**Option A (Recommended):** Create the index in Firebase Console
   - Click the link in the error message
   - OR go to: Firebase Console → Firestore → Indexes → Create Composite Index
   - Add the fields shown in the error
   - Wait 5-10 minutes for index to build

**Option B (Quick Fix):** Simplify the query
   - Remove inequality filters (neq, lt, gt, etc.)
   - Filter the results in memory using `.filter()`
   - Less efficient but works immediately

**Best Practice:**
- Keep queries simple (max 2-3 equality filters)
- Use in-memory filtering for complex conditions
- Create composite indexes proactively for frequently-used queries

### Migration SQL Files - IGNORE THEM!

**Important**: The `/supabase/migrations/` directory may contain SQL files from the old Supabase setup. These files are:
- ❌ Not executed
- ❌ Not functional with Firebase
- ❌ For historical reference only

**Never create new SQL migration files!**

## 🌐 IMPORTANT: Git Branches & Deployment

### Branch Structure:
- **main branch**: Development/staging branch
- **production branch**: PRODUCTION BRANCH connected to Netlify for live deployment
  - GitHub: https://github.com/a7mdelbanna/kool-skool/tree/production
  - **ALWAYS push to production branch for live deployment**
  - Command: `git push origin main:production` to deploy main to production

### Deployment Workflow:
1. Develop and test on `main` branch
2. When ready for production: `git push origin main:production`
3. Netlify automatically deploys from production branch
4. **NEVER create a new production branch locally - it already exists on remote!**

### 🔒 Netlify Secrets Scanning Fix:

**Problem**: Netlify scans repository for exposed secrets and blocks deployment if found.

**Solution Approach**:
1. **Firebase API Keys** are already whitelisted in `netlify.toml`:
   ```toml
   [build.environment]
   SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES = "AIzaSyA9wv23oSmC9bG-Bx9hA2KG2pAZBjHTO-A"
   ```
   - Firebase API keys are meant to be public (secured via Firebase Security Rules)
   - This configuration tells Netlify to ignore this specific API key

2. **Test/Temporary Files** with API keys must be excluded:
   - Add any test scripts (e.g., `test-renewal.js`, `cleanup-*.js`) to `.gitignore`
   - Remove them from git tracking: `git rm --cached filename.js`
   - These files should NEVER be committed to the repository

3. **When Netlify Deployment Fails with Secrets Error**:
   ```bash
   # Step 1: Identify the files mentioned in Netlify error log
   # Step 2: Add them to .gitignore
   # Step 3: Remove from git tracking
   git rm --cached problematic-file.js
   # Step 4: Commit and push
   git add .gitignore
   git commit -m "Remove test scripts from repository to fix Netlify secrets scan"
   git push origin production
   ```

4. **Prevention**:
   - Never commit test/debug scripts with hardcoded credentials
   - Keep test files local only (add to .gitignore immediately)
   - Use environment variables for sensitive data in actual code

## 📋 Available Agents

### Master Coordinator
- **Agent**: `project-orchestrator`
- **Use**: For coordinating multiple development tasks
- **Command**: `@orchestrator [task description]`

### Product & Design
- **Agent**: `prd-agent` - Product requirements and specifications
- **Agent**: `ui-ux-agent` - UI/UX design and components

### Development Team
- **Agent**: `frontend-agent` - React/TypeScript development
- **Agent**: `backend-agent` - Firebase/Firestore services
- **Agent**: `integration-agent` - API integrations

### Quality Assurance
- **Agent**: `testing-agent` - Test creation and validation
- **Agent**: `security-agent` - Security audits and permissions
- **Agent**: `performance-agent` - Performance optimization

### Documentation
- **Agent**: `documentation-agent` - Documentation and guides

## 🎯 Agent Activation Commands

```bash
# Single agent activation
@frontend-agent: Create a new dashboard component

# Multiple parallel agents
@parallel: [
  @prd-agent: Define requirements for user analytics
  @ui-ux-agent: Design the analytics dashboard
  @architecture-agent: Plan the data structure
]

# Workflow activation
@workflow:new-feature: User Analytics Dashboard
```

## 📁 Project Context

All agents have access to:
- `/agents/.claude-agents/context/` - Project context files
- `/agents/.claude-agents/templates/` - Code templates
- `/agents/.claude-agents/config.json` - Agent configurations

## 🔄 Development Workflows

### New Feature Workflow
```
1. @prd-agent → Requirements
2. @architecture-agent → Technical design
3. @ui-ux-agent → UI design
4. @parallel: [@frontend-agent, @backend-agent]
5. @testing-agent → Tests
6. @documentation-agent → Docs
```

### Bug Fix Workflow
```
1. @testing-agent → Identify issue
2. @frontend-agent OR @backend-agent → Fix
3. @security-agent → Verify
```

### Refactor Workflow
```
1. @architecture-agent → Plan refactor
2. @parallel: [@frontend-agent, @testing-agent]
3. @performance-agent → Optimize
```

## 🛠️ Agent Usage Examples

### Example 1: Creating a New Feature
```
@orchestrator: I need to add a student attendance tracking feature

The orchestrator will:
1. Activate PRD agent for requirements
2. Design the UI with UI/UX agent
3. Implement with frontend/backend agents
4. Create tests with testing agent
5. Document with documentation agent
```

### Example 2: Parallel Development
```
@parallel: [
  @frontend-agent: Create the attendance UI components
  @backend-agent: Set up Firebase collections for attendance
  @integration-agent: Create the attendance service layer
]
```

### Example 3: Specific Agent Task
```
@frontend-agent: Create a reusable AttendanceCard component using the template in /agents/.claude-agents/templates/component.template.tsx
```

## 📊 Agent Capabilities

### Frontend Agent
- React component creation
- TypeScript interfaces
- State management
- UI implementation
- Uses: Tailwind CSS, shadcn/ui

### Backend Agent
- Firebase service creation
- Firestore operations
- Security rules
- Cloud functions
- Authentication flows

### Testing Agent
- Unit test creation
- Integration tests
- E2E test scenarios
- Test coverage analysis

### Security Agent
- RBAC implementation
- Security rule audits
- Permission validation
- Data privacy checks

## 🔧 Configuration

Agent configuration is stored in:
```
/agents/.claude-agents/config.json
```

## 📝 Templates

Agents use standardized templates:
- `component.template.tsx` - React components
- `service.template.ts` - Service layers
- `hook.template.ts` - Custom hooks
- `page.template.tsx` - Page components

## 🚦 Quality Checkpoints

Before completing any task:
1. ✅ Code follows patterns in `/agents/.claude-agents/context/code-patterns.md`
2. ✅ Business rules validated against `/agents/.claude-agents/context/business-rules.md`
3. ✅ Architecture aligned with `/agents/.claude-agents/context/architecture.md`
4. ✅ Tests created for new functionality
5. ✅ Documentation updated

## 🔄 Context Switching

To switch between agents:
```
@switch-agent: frontend-agent
```

To return to orchestrator:
```
@orchestrator: resume coordination
```

## 💡 Best Practices

1. **Use parallel agents** for independent tasks
2. **Follow templates** for consistency
3. **Check context files** before major decisions
4. **Run tests** after implementations
5. **Document changes** immediately

## 🐛 Debugging

If an agent fails:
1. Check the error message
2. Verify context files are accessible
3. Ensure proper permissions
4. Try individual agent instead of parallel

## 📈 Performance Tips

- Use `@parallel` for independent tasks
- Cache frequently accessed data
- Follow React best practices
- Optimize Firebase queries
- Use proper TypeScript types

## 🔐 Security Reminders

- Never expose API keys
- Always validate user input
- Follow RBAC strictly
- Test security rules
- Audit permissions regularly

## Important Notes

- Agents work best with specific, well-defined tasks
- Provide context when switching between agents
- Use the orchestrator for complex multi-step tasks
- Templates ensure consistency across the codebase
- Always test after implementation

## Quick Command Reference

```bash
# Activate specific agent
@[agent-name]: [task]

# Parallel execution
@parallel: [agent-tasks-array]

# Workflow execution
@workflow:[workflow-name]: [description]

# Switch agent
@switch-agent: [agent-name]

# Get agent status
@status: [agent-name]

# Review agent output
@review: [agent-name]
```

---

Ready to use the agent system? Start with:
```
@orchestrator: What would you like to build today?
```