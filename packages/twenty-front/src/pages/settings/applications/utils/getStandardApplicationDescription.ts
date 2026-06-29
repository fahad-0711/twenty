import { t } from '@lingui/core/macro';

export const getStandardApplicationDescription =
  (): string => t`The base data model every CallLive AI workspace runs on.

#### What "foundation" means

Every CallLive AI workspace starts with this set of objects. They define the shape of your CRM, including relationships, activity, and reporting. Everything else, including marketplace apps, AI agents, and custom objects, plugs into them.

#### Included objects
- **People & Companies**: contact and account records
- **Opportunities**: your sales pipeline
- **Notes & Tasks**: activity and follow-ups
- **Workflows & Dashboards**: automation and reporting

Remove this app and the rest of CallLive AI has nothing to hang off.

#### Build your own app

Extend CallLive AI with your own objects, fields, logic functions, or AI skills. Scaffold a new app in one command:

\`\`\`bash
npx create-twenty-app@latest my-calllive-app
\`\`\`

Then inside the folder:

\`\`\`bash
cd my-calllive-app
yarn twenty dev
\`\`\`

See the [Getting Started guide](https://calllive.ai/developers/extend/apps/getting-started) for the full walkthrough, and [Building Apps](https://calllive.ai/developers/extend/apps/building) for the \`defineApplication\` / \`defineEntity\` APIs.`;
