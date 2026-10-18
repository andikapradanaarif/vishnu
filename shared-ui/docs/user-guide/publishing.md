# Publishing

This guide covers building, versioning, and publishing the @nexus/ui-component library.

## Table of Contents

- [Building](#building)
- [Versioning](#versioning)
- [Publishing](#publishing)
- [Publishing to Private Registry](#publishing-to-private-registry)
- [Post-Publishing](#post-publishing)
- [Troubleshooting](#troubleshooting)

---

## Building

### Production Build

Build the library for production:

```bash
bun run build
```

This command will:

1. Clean the `dist/` directory
2. Build the library using Bun (`scripts/build.sh`)
3. Generate TypeScript declaration files via `tsc`

### Build Output

The build process creates the following files in the `dist/` directory:

```
dist/
├── index.mjs          # Main ESM bundle
└── index.d.ts         # TypeScript declarations
```

### Development Build

For development, use watch mode:

```bash
bun run dev
```

This starts Bun in watch mode, automatically rebuilding when you make changes.

### Build Configuration

The build is configured in `scripts/build.sh`:

```bash
bun build ./index.ts \
  --bundle \
  --outfile ./dist/index.mjs \
  --target node \
  --external react \
  --external react-dom \
  --external react/jsx-runtime \
  --external react/jsx-dev-runtime \
  --external @tanstack/react-form \
  --minify

tsc --project tsconfig.build.json
```

### External Dependencies

The following packages are marked as external and not bundled:

- `react` and `react-dom` - Peer dependencies
- `@tanstack/react-form` - Peer dependency

These must be installed by the consumer of the library.

---

## Versioning

### Semantic Versioning

This library follows Semantic Versioning (SemVer):

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Version Bump

Before publishing, update the version in `package.json`:

```bash
# Patch version (bug fixes)
bun version patch

# Minor version (new features)
bun version minor

# Major version (breaking changes)
bun version major
```

This will:

1. Update the version in `package.json`
2. Create a git commit with the version change
3. Create a git tag for the version

### Manual Version Update

Alternatively, manually update the version in `package.json`:

```json
{
	"name": "@nexus/ui-component",
	"version": "1.0.1"
}
```

Then commit the change:

```bash
git add package.json
git commit -m "Bump version to 1.0.1"
git tag v1.0.1
```

---

## Publishing

### Prerequisites

Before publishing, ensure:

1. You're logged in to npm:

   ```bash
   npm login
   ```

2. The package name is available in npm
3. You have publish permissions for the package

### Publishing to npm

1. Build the library:

   ```bash
   bun run build
   ```

2. Publish to npm:

   ```bash
   npm publish
   ```

3. Verify the package on npm:
   ```bash
   npm view @nexus/ui-component
   ```

### Publishing with Access Levels

#### Public Package

```bash
npm publish --access public
```

Use this for packages that should be publicly accessible.

#### Scoped Public Package

For scoped packages (e.g., `@nexus/ui-component`), you must specify public access:

```bash
npm publish --access public
```

### Dry Run

Test the publish process without actually publishing:

```bash
npm publish --dry-run
```

This will show what would be published without uploading to the registry.

---

## Publishing to Private Registry

### Private npm Registry

If you're using a private npm registry (e.g., Nexus, Artifactory, Verdaccio):

```bash
npm publish --registry=<your-registry-url>
```

Example:

```bash
npm publish --registry=https://npm.yourcompany.com
```

### Configure Registry in .npmrc

Add the registry to your `.npmrc` file:

```ini
@nexus:registry=https://npm.yourcompany.com
```

Then publish normally:

```bash
npm publish
```

### Authentication

For private registries, you may need to authenticate:

```bash
npm login --registry=https://npm.yourcompany.com
```

Or set up an authentication token:

```bash
npm config set //npm.yourcompany.com/:_authToken YOUR_TOKEN
```

---

## Post-Publishing

### Git Tags

Push the version tag to GitHub:

```bash
git push origin v1.0.1
```

### GitHub Release

Create a GitHub release for the version:

1. Go to the repository on GitHub
2. Click "Releases"
3. Click "Create a new release"
4. Select the tag you just pushed
5. Add release notes
6. Publish the release

### Changelog

Maintain a CHANGELOG.md file to document changes:

```markdown
# Changelog

## [1.0.1] - 2026-01-06

### Added

- New Calendar component
- useSlicedPages hook

### Fixed

- Button loading state issue
- Input validation error

### Changed

- Updated peer dependencies
```

### Notify Consumers

Notify consumers of the library about the new version:

- Update documentation
- Send release notes to team
- Update dependent projects

---

## Troubleshooting

### Build Errors

#### TypeScript Errors

If you encounter TypeScript errors during build:

```bash
# Check TypeScript errors
npx tsc --noEmit
```

Common issues:

- Missing type definitions
- Incorrect import paths
- Type mismatches

#### Build Errors

If the build fails:

1. Check `scripts/build.sh` for syntax errors
2. Verify all imports are correct
3. Ensure external dependencies are listed
4. Check for circular dependencies

### Publish Errors

#### "Package name already exists"

If the package name is already taken:

- Choose a different name
- Or use a scoped name: `@your-username/ui-component`

#### "403 Forbidden"

If you get a 403 error:

- Verify you're logged in: `npm whoami`
- Check you have publish permissions
- For scoped packages, use `--access public`

#### "404 Not Found"

If you get a 404 error:

- Verify the registry URL
- Check your `.npmrc` configuration
- Ensure the package name is correct

#### Authentication Issues

If you have authentication problems:

```bash
# Logout and login again
npm logout
npm login

# Or use a token
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### Version Conflicts

#### Local Version vs Published Version

If your local version doesn't match the published version:

```bash
# Check published version
npm view @nexus/ui-component version

# Update local version
npm version patch
```

#### Dependency Conflicts

If consumers have dependency conflicts:

- Update peer dependencies
- Use broader version ranges
- Document compatibility requirements

### File Not Included

If files are missing from the published package:

1. Check `package.json` files field:

   ```json
   {
   	"files": ["dist", "styles.css"]
   }
   ```

2. Verify `.npmignore` or `.gitignore` isn't excluding files
3. Check the build output directory

### TypeScript Definitions Missing

If type definitions are missing:

1. Ensure `declaration: true` in `tsconfig.json`
2. Run `tsc --emitDeclarationOnly` after build
3. Verify `index.d.ts` exists in `dist/`

---

## Best Practices

### 1. Test Before Publishing

Always test the built package before publishing:

```bash
# Build
bun run build

# Test locally
npm pack
bun add ./nexus-ui-component-1.0.0.tgz
```

### 2. Use Semantic Versioning

Follow SemVer strictly to avoid breaking consumers:

- MAJOR for breaking changes
- MINOR for new features
- PATCH for bug fixes

### 3. Document Changes

Maintain a changelog for every release:

```markdown
## [1.0.0] - 2026-01-06

### Added

- Initial release
- Button, Input, Alert components
```

### 4. Tag Releases

Always create git tags for releases:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 5. Use .npmignore

Exclude unnecessary files from the package:

```
# .npmignore
src/
docs/
tests/
*.test.ts
*.spec.ts
tsconfig.json
scripts/build.sh
.gitignore
```

### 6. Verify Package Contents

Check what's being published:

```bash
npm pack --dry-run
```

This shows the files that would be included without actually publishing.

### 7. Use CI/CD

Automate the publishing process with CI/CD:

```yaml
# Example GitHub Actions
- name: Build
  run: bun run build

- name: Publish
  run: npm publish
  if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
```

---

## Package.json Reference

Key fields in `package.json` for publishing:

```json
{
	"name": "@nexus/ui-component",
	"version": "1.0.0",
	"description": "Shared UI component library",
	"main": "dist/index.mjs",
	"module": "dist/index.mjs",
	"types": "dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"import": "./dist/index.mjs",
			"default": "./dist/index.mjs"
		},
		"./styles.css": {
			"default": "./styles.css"
		}
	},
	"files": ["dist", "styles.css"],
	"peerDependencies": {
		"react": "^19.3.1",
		"react-dom": "^19.3.1",
		"@tanstack/react-form": "^1.33.5",
		"tailwindcss": "^4.3.3"
	}
}
```

### Fields Explained

- `name`: Package name (use scoped names for private packages)
- `version`: Current version (follow SemVer)
- `main`: Entry point for CommonJS
- `module`: Entry point for ES modules
- `types`: TypeScript declaration file
- `exports`: Package exports for modern bundlers
- `files`: Files to include in the published package
- `peerDependencies`: Dependencies that consumers must install
