# 🤖 Kool-Skool Agent System - Parallel Development Framework

## Overview
This directory contains specialized agent prompts designed for parallel development of the Kool-Skool school management system. Each agent has a specific role and can work independently while coordinating with other agents.

## 🎯 Agent Directory

### Core Development Agents

| Agent | File | Primary Responsibility | Key Skills |
|-------|------|----------------------|------------|
| **Mobile Architect** | `01-mobile-architect-agent.md` | Mobile app architecture & monorepo setup | React Native, Expo, TypeScript, Monorepo |
| **React Native UI** | `02-react-native-ui-agent.md` | Mobile UI/UX implementation | React Native, NativeWind, Animations |
| **Firebase Backend** | `03-firebase-backend-agent.md` | Backend services & database optimization | Firestore, Auth, Security Rules |
| **Web-to-Mobile Converter** | `04-web-to-mobile-converter-agent.md` | Convert React components to React Native | React → React Native migration |
| **Design System** | `05-design-system-agent.md` | Unified design language across platforms | Design Tokens, Component Library |

### Quality & Operations Agents

| Agent | File | Primary Responsibility | Key Skills |
|-------|------|----------------------|------------|
| **Testing & QA** | `06-testing-quality-agent.md` | Comprehensive testing strategies | Jest, Detox, Cypress, E2E Testing |
| **Performance** | `07-performance-optimization-agent.md` | Speed & efficiency optimization | Bundle optimization, Caching, Monitoring |
| **Web Frontend** | `08-web-frontend-agent.md` | Web application maintenance | React, TypeScript, Vite, Tailwind |
| **DevOps** | `09-devops-deployment-agent.md` | CI/CD & deployment automation | GitHub Actions, EAS, Vercel |
| **Security** | `10-security-compliance-agent.md` | Security & regulatory compliance | GDPR, OWASP, Platform policies |

## 🚀 How to Use These Agents

### 1. Adding Agents to Claude Code

1. Open each agent file
2. Copy the entire content
3. In Claude Code, create a new agent with the corresponding name
4. Paste the prompt content
5. Activate the agent when needed

### 2. Parallel Execution Example

```bash
# Start multiple agents for a new feature
@mobile-architect: Set up monorepo structure
@react-native-ui: Create Dashboard screen components
@firebase-backend: Optimize student queries for mobile
@testing-qa: Write test cases for new features
```

### 3. Agent Coordination

Agents can work in parallel but should coordinate on:
- **Shared interfaces** (TypeScript types)
- **API contracts** (Firebase services)
- **Design tokens** (colors, spacing)
- **Testing standards** (coverage requirements)

## 📋 Workflow Examples

### New Feature Development
```
1. @design-system → Define UI components
2. @mobile-architect → Plan implementation
3. Parallel:
   - @react-native-ui → Build UI
   - @firebase-backend → Create services
   - @web-frontend → Update web app
4. @testing-qa → Test everything
5. @devops → Deploy
```

### Performance Optimization
```
1. @performance → Audit current performance
2. Parallel:
   - @react-native-ui → Optimize components
   - @firebase-backend → Optimize queries
3. @testing-qa → Verify improvements
```

### Security Update
```
1. @security → Identify vulnerabilities
2. @firebase-backend → Update security rules
3. @devops → Deploy patches
4. @testing-qa → Security testing
```

## 🔄 Agent Communication Matrix

| From ↓ To → | Architect | UI | Backend | Converter | Design | Testing | Performance | Web | DevOps | Security |
|-------------|-----------|-----|---------|-----------|---------|---------|-------------|-----|--------|----------|
| **Architect** | - | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **UI** | ✅ | - | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Backend** | ✅ | ⚠️ | - | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Converter** | ✅ | ✅ | ⚠️ | - | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| **Design** | ✅ | ✅ | ⚠️ | ✅ | - | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| **Testing** | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| **Performance** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | - | ✅ | ✅ | ⚠️ |
| **Web** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| **DevOps** | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | - | ✅ |
| **Security** | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | - |

✅ = Direct communication | ⚠️ = Occasional coordination

## 📊 Agent Capabilities Summary

### Code Generation
- **High**: Mobile Architect, React Native UI, Web Frontend, Converter
- **Medium**: Firebase Backend, Design System
- **Low**: Testing, Performance, DevOps, Security

### System Design
- **High**: Mobile Architect, Design System, Security
- **Medium**: Firebase Backend, Performance, DevOps
- **Low**: UI Agents, Testing, Converter

### Optimization
- **High**: Performance, Firebase Backend
- **Medium**: Mobile Architect, UI Agents
- **Low**: Testing, Security, DevOps

## 🎯 Success Metrics

Each agent has specific success metrics:

1. **Mobile Architect**: 70%+ code reuse, clean architecture
2. **React Native UI**: 60 FPS animations, pixel-perfect UI
3. **Firebase Backend**: <100ms queries, zero security issues
4. **Converter**: 70%+ successful conversions
5. **Design System**: 100% token adoption
6. **Testing**: 80%+ coverage, zero P0 bugs
7. **Performance**: 90+ Lighthouse score, <3s load time
8. **Web Frontend**: Feature parity with mobile
9. **DevOps**: 99.9% uptime, <5min deployments
10. **Security**: Zero breaches, 100% compliance

## 🔧 Agent Customization

You can customize agents by modifying:
- **Context**: Add project-specific information
- **Responsibilities**: Adjust based on your needs
- **Standards**: Update quality metrics
- **Communication**: Define coordination rules

## 📝 Notes

- Agents work best with specific, well-defined tasks
- Use parallel execution for independent tasks
- Ensure proper coordination for dependent work
- Review agent outputs before merging
- Keep agents updated with project changes

## 🚦 Getting Started

1. **Setup Phase**: Start with Mobile Architect and Design System agents
2. **Development Phase**: Run UI, Backend, and Converter agents in parallel
3. **Quality Phase**: Engage Testing and Performance agents
4. **Deployment Phase**: Use DevOps and Security agents

---

**Remember**: These agents are designed to work together. The more specific your instructions, the better the results. Happy coding! 🚀