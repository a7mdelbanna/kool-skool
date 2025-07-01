
# Environment Configuration Guide

This guide explains how environment variables, configuration files, and project settings work in the School Management System.

## Table of Contents

1. [Configuration Overview](#configuration-overview)
2. [Supabase Configuration](#supabase-configuration)
3. [Application Settings](#application-settings)
4. [Development vs Production](#development-vs-production)
5. [Security Considerations](#security-considerations)
6. [Configuration Checklist](#configuration-checklist)

---

## Configuration Overview

### Important Note
**This project does NOT use traditional `.env` files.** All configuration is handled through:
- Hardcoded values in source files
- Supabase configuration files
- Runtime configuration in database

### Configuration Sources
1. **Supabase Client Configuration**: `src/integrations/supabase/client.ts`
2. **Supabase Project Config**: `supabase/config.toml`
3. **Database Settings**: Stored in `schools` table
4. **Build Configuration**: `vite.config.ts`, `package.json`

---

## Supabase Configuration

### 1. Client Configuration
**File**: `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://clacmtyxfdtfgjkozmqf.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWNtdHl4ZmR0Zmdqa296bXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTEzMzgsImV4cCI6MjA2NjQ2NzMzOH0.HKKmBmDpQdZ7-hcpj7wM8IJPFVD52T-IfThF9jpjdvY"

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**For Your Project**: Update these values with your Supabase project credentials:
- `supabaseUrl`: Your project URL from Supabase dashboard
- `supabaseKey`: Your project's anon key from Supabase dashboard

### 2. Supabase Project Configuration
**File**: `supabase/config.toml`

```toml
project_id = "clacmtyxfdtfgjkozmqf"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
port = 54322
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
refresh_token_rotation_enabled = true
refresh_token_reuse_interval = 10
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[edge_functions]
enabled = true

[functions.create_course]
verify_jwt = false

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
port = 54325
file_size_limit = "50MiB"

[analytics]
enabled = false
```

**For Your Project**: Update the `project_id` with your Supabase project ID.

### 3. Getting Your Supabase Credentials

#### From Supabase Dashboard:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Settings > API
4. Copy:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: (for admin operations, handle carefully)

#### Project ID Location:
- Visible in the URL: `https://supabase.com/dashboard/project/YOUR-PROJECT-ID`
- Also shown in Settings > General

---

## Application Settings

### 1. Database-Driven Configuration
Many settings are stored in the database rather than config files:

#### School Settings
```sql
-- Example school configuration
SELECT 
    name,
    timezone,
    contact_info,
    logo
FROM schools;
```

**Configurable per school**:
- Timezone (affects date/time display)
- Contact information (phone, email, address)
- School logo
- Currency preferences

#### User Preferences
```sql
-- User-specific settings
SELECT 
    timezone,
    role,
    school_id
FROM users;
```

### 2. Default Application Settings

#### Timezone Handling
- **Default**: UTC
- **User Override**: Stored in `users.timezone`
- **School Override**: Stored in `schools.timezone`
- **Display Logic**: User > School > UTC

#### Currency Settings
- **Multi-currency Support**: Via `currencies` table
- **Default Currency**: One per school marked `is_default = true`
- **Exchange Rates**: Stored but not auto-updated

#### Session Defaults
- **Default Duration**: 60 minutes
- **Default Status**: 'scheduled'
- **Payment Status**: 'paid'

---

## Development vs Production

### Development Configuration

#### Local Development URLs
```typescript
// Current hardcoded for original project
const supabaseUrl = "https://clacmtyxfdtfgjkozmqf.supabase.co"

// For your development project
const supabaseUrl = "https://your-dev-project-id.supabase.co"
```

#### Local Supabase Development
If using Supabase CLI for local development:
```toml
# supabase/config.toml for local development
[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323
```

### Production Configuration

#### Production URLs
```typescript
// Production Supabase configuration
const supabaseUrl = "https://your-prod-project-id.supabase.co"
const supabaseKey = "your-production-anon-key"
```

#### Deployment Considerations
1. **Supabase Project**: Use separate projects for dev/staging/production
2. **Domain Configuration**: Update site URLs in Supabase auth settings
3. **Database Migrations**: Ensure all migrations are applied
4. **RLS Policies**: Test thoroughly in production environment

### Environment-Specific Settings

#### Development
- **Debugging**: Console logs enabled
- **Mock Data**: Sample data in dashboard components
- **Relaxed Security**: Plain text passwords (fix before production)

#### Production
- **Security**: Remove console logs, implement password hashing
- **Performance**: Optimize queries, enable caching
- **Monitoring**: Set up error tracking and performance monitoring

---

## Security Considerations

### 1. API Keys and Secrets

#### Public vs Private Keys
- **Anon Key**: Safe to expose in frontend code
- **Service Role Key**: NEVER expose in frontend - server-side only
- **Database Passwords**: Store securely, never in code

#### Key Rotation
- **Regular Rotation**: Change keys periodically
- **Compromised Keys**: Immediately rotate and update all deployments
- **Access Monitoring**: Track API key usage

### 2. Database Configuration

#### Row Level Security (RLS)
- **Enable RLS**: On all tables with sensitive data
- **Test Policies**: Verify RLS policies work correctly
- **Performance**: Monitor RLS policy performance impact

#### Connection Security
- **SSL/TLS**: Always use encrypted connections
- **Connection Limits**: Configure appropriate connection pooling
- **Network Security**: Use VPCs or network restrictions if available

---

## Configuration Checklist

### Initial Setup
- [ ] Create new Supabase project
- [ ] Update `src/integrations/supabase/client.ts` with new credentials
- [ ] Update `supabase/config.toml` with new project ID
- [ ] Run database migrations
- [ ] Create initial admin user
- [ ] Test database connection

### Authentication Configuration
- [ ] Update auth settings in Supabase dashboard
- [ ] Set site URL and redirect URLs
- [ ] Test login flows for all user types
- [ ] Verify RLS policies work with custom auth

### School Configuration
- [ ] Create initial school record
- [ ] Set school timezone
- [ ] Configure default currency
- [ ] Add school contact information
- [ ] Create default accounts and categories

### Testing Configuration
- [ ] Create test users for each role
- [ ] Test all major features
- [ ] Verify data isolation between schools
- [ ] Test session generation and scheduling
- [ ] Validate financial calculations

### Production Readiness
- [ ] Implement password hashing
- [ ] Remove debug console logs
- [ ] Set up error monitoring
- [ ] Configure backup strategy
- [ ] Test disaster recovery procedures
- [ ] Set up performance monitoring

---

## Common Configuration Issues

### 1. Supabase Connection Errors
**Symptoms**: "Failed to fetch" or connection timeouts
**Causes**:
- Incorrect project URL or API key
- Network connectivity issues
- Supabase service outage

**Solutions**:
- Verify credentials in Supabase dashboard
- Test connection with simple query
- Check Supabase status page

### 2. Authentication Failures
**Symptoms**: Login always fails despite correct credentials
**Causes**:
- RPC functions not created
- Database user records missing
- Role mismatches

**Solutions**:
- Verify RPC functions exist: `SELECT proname FROM pg_proc WHERE proname LIKE '%login%';`
- Check user table data
- Validate role values match expected strings

### 3. RLS Policy Conflicts
**Symptoms**: "Row level security policy violation" errors
**Causes**:
- RLS policies assume Supabase Auth (auth.uid())
- Incorrect policy logic
- Missing policy for operation type

**Solutions**:
- Review and update RLS policies for custom auth
- Temporarily disable RLS for debugging
- Use security definer functions to bypass RLS

### 4. Timezone Display Issues
**Symptoms**: Times shown in wrong timezone
**Causes**:
- Browser timezone differs from user/school settings
- Inconsistent timezone handling in code
- Database storing times in local timezone instead of UTC

**Solutions**:
- Standardize on UTC storage, local display
- Use consistent timezone conversion functions
- Test with users in different timezones

---

## Advanced Configuration

### 1. Custom Domain Setup
If deploying to custom domain:
1. Configure domain in hosting platform (Netlify, Vercel, etc.)
2. Update site URLs in Supabase auth settings
3. Update any hardcoded URLs in application
4. Test authentication flows with new domain

### 2. Multi-Environment Setup
For proper dev/staging/production workflow:
1. Create separate Supabase projects for each environment
2. Use environment-specific configuration files
3. Implement proper CI/CD pipeline
4. Separate database instances for each environment

### 3. Performance Optimization
- **Database Indexes**: Add indexes for frequently queried columns
- **Connection Pooling**: Configure Supabase connection limits
- **Caching**: Implement query result caching where appropriate
- **CDN**: Use CDN for static assets

---

This completes the environment configuration guide. Remember to secure your credentials and test thoroughly in each environment before deploying.
