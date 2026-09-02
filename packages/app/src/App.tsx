import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import techDocsPlugin from '@backstage/plugin-techdocs/alpha';
import { techDocsMermaidAddonModule } from 'backstage-plugin-techdocs-addon-mermaid';
import kubernetesPlugin from '@backstage/plugin-kubernetes/alpha';
import { navModule } from './modules/nav';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { compatWrapper } from '@backstage/core-compat-api';

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => (
      <SignInPage
        {...props}
        provider={{
          id: 'github-auth-provider',
          title: 'GitHub',
          message: 'Sign in using GitHub',
          apiRef: githubAuthApiRef,
        }}
      />
    ),
  },
});

const argoCdOverviewCard = EntityCardBlueprint.make({
  name: 'argocd-overview',
  params: {
    filter: 'has:annotation:argocd/app-name',
    loader: () =>
      import('@roadiehq/backstage-plugin-argo-cd').then(m =>
        compatWrapper(<m.EntityArgoCDOverviewCard />),
      ),
  },
});

const argoCdHistoryCard = EntityCardBlueprint.make({
  name: 'argocd-history',
  params: {
    filter: 'has:annotation:argocd/app-name',
    loader: () =>
      import('@roadiehq/backstage-plugin-argo-cd').then(m =>
        compatWrapper(<m.EntityArgoCDHistoryCard />),
      ),
  },
});

export default createApp({
  features: [
    catalogPlugin,
    techDocsPlugin,
    techDocsMermaidAddonModule,
    kubernetesPlugin,
    navModule,
    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPage],
    }),
    createFrontendModule({
      pluginId: 'catalog',
      extensions: [argoCdOverviewCard, argoCdHistoryCard],
    }),
  ],
});