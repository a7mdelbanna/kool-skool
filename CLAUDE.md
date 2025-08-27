# Claude Agent System - Instructions

## 🚀 Quick Start

This project uses a multi-agent system for efficient parallel development. Each agent specializes in specific aspects of development.

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