export const en = {
  meta: {
    title: 'ModelMesh · Open-source AI model routing',
    description:
      'ModelMesh is an open-source platform for discovering, comparing, monitoring, and routing AI model providers.',
  },
  common: {
    brandHome: 'ModelMesh home',
    viewModel: 'View {{model}}',
  },
  nav: {
    mainLabel: 'Main navigation',
    home: 'Home',
    models: 'Models',
    account: 'Account',
    routing: 'Routing',
    features: 'Features',
    login: 'Log in',
    register: 'Sign up',
  },
  footer: {
    tagline: 'Open and transparent AI model infrastructure.',
    models: 'Models',
    docs: 'Docs',
    license: 'License',
  },
  theme: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
  },
  home: {
    hero: {
      badge: 'Open-source AI model routing',
      titleLine1: 'Connect once.',
      titleLine2: 'Find the best route\u00a0',
      titleHighlight: 'for every request.',
      description:
        'Discover, compare, monitor, and route models using real pricing, latency, and availability signals.',
      explore: 'Explore models',
      openSource: 'View on GitHub',
      benefitCompatible: 'OpenAI-compatible API',
      benefitNoLockIn: 'No provider lock-in',
      benefitLocalData: 'You control your data',
    },
    routingPreview: {
      title: 'Live routing decision',
      live: 'Live',
      request: 'Request',
      mode: 'mode',
      priority: 'priority',
      selected: 'Selected',
      estimatedSavings: '31.4% estimated savings',
    },
    stats: {
      models: 'Models indexed',
      channels: 'Available channels',
      availability: 'Blended availability',
      savings: 'Average cost savings',
    },
    market: {
      eyebrow: 'MODEL MARKET',
      title: 'Choose from real signals',
      description:
        'Compare channel pricing, recent success rates, and latency. The data below is for demonstration.',
      updating: 'Catalog continuously updated',
      searchPlaceholder: 'Search models, channels, or tags',
      healthyOnly: 'Healthy channels only',
      columns: {
        model: 'Model / channel',
        input: 'Input / 1M',
        output: 'Output / 1M',
        success: 'Recent success',
        latency: 'Latency',
        status: 'Status',
      },
      emptyTitle: 'No matching channels',
      emptyDescription: 'Try another keyword or turn off “Healthy channels only”.',
      refresh: 'Health data refreshes every 60 seconds',
      channelCount: '{{visible}} / {{total}} channels',
      status: {
        healthy: 'Healthy',
        watch: 'Watch',
      },
      tags: {
        lowCost: 'Low cost',
        highConcurrency: 'High concurrency',
        fast: 'Fast',
        longContext: 'Long context',
        highQuality: 'High quality',
        toolUse: 'Tool use',
        chinese: 'Chinese',
      },
    },
    value: {
      eyebrow: 'OPEN SOURCE',
      features: {
        health: {
          title: 'Real health signals',
          description:
            'Continuously sample success rate, time to first token, and total response time instead of trusting provider claims.',
        },
        routing: {
          title: 'Explainable routing',
          description:
            'Combine price, quality, region, and availability policies. Every routing choice has a clear reason.',
        },
        security: {
          title: 'Keep control of your keys',
          description:
            'Sensitive credentials stay in your self-hosted backend. The frontend never handles provider keys.',
        },
      },
      title: 'Open infrastructure, run your way.',
      description:
        'Built with React, UnoCSS, Rust, and Axum. Run locally, deploy privately, or contribute a new provider adapter.',
      repository: 'View repository',
      docs: 'Read the docs',
      compatible: 'OpenAI compatible',
    },
  },
  pages: {
    models: {
      badge: 'MODEL CATALOG',
      title: 'Model catalog',
      description:
        'Search available models and provider channels, then compare real success, latency, and pricing signals.',
      stats: {
        models: 'Models',
        channels: 'Channels',
        refresh: 'Status refresh',
      },
      explorer: {
        brand: {
          title: 'Choose a brand',
          description: 'Start with the company behind the model',
          merchantCount: '{{count}} merchants',
        },
        model: {
          title: 'Choose a model',
          description: 'Browse models available for this brand',
          inputFrom: 'Input from {{price}} / 1M',
          merchantCount: '{{count}} channels',
        },
        token: {
          title: 'Choose a token',
          description: 'The token determines which routing policy is used',
          active: 'Active',
          idle: 'Available',
          create: 'Create token',
        },
        selection: 'Current selection',
      },
      merchants: {
        eyebrow: 'MERCHANT ROUTES',
        title: 'Merchants for {{model}}',
        description:
          'Compare pricing, live rate, success, and response latency for every merchant.',
        demo: 'Demonstration data',
        selectedToken: 'Current token: {{token}}',
        searchPlaceholder: 'Search merchants',
        healthyOnly: 'Healthy only',
        sort: {
          success: 'Success rate',
          price: 'Lowest price',
          latency: 'Lowest latency',
        },
        columns: {
          merchant: 'Merchant',
          input: 'Input / 1M',
          output: 'Output / 1M',
          rate: 'Live rate',
          success: 'Live success',
          latency: 'Latency',
          tags: 'Tags',
          recent: 'Last success',
          action: 'Actions',
        },
        tags: {
          stable: 'Stable',
          lowCost: 'Low cost',
          fast: 'Fast',
          quality: 'Quality',
        },
        descriptions: {
          northstar: 'Priority route · global edge',
          vertexRelay: 'Regional pool · high concurrency',
          alloyCloud: 'Quality route · tool optimized',
          swiftGate: 'Economy pool · shared capacity',
          atlasRoute: 'Dedicated capacity · low latency',
          nebulaApi: 'Community route · burst traffic',
        },
        lastSuccess: {
          justNow: 'Just now',
          oneMinute: '1 min ago',
          twoMinutes: '2 min ago',
          fiveMinutes: '5 min ago',
          twelveMinutes: '12 min ago',
        },
        pin: 'Pin merchant',
        pinned: 'Pinned',
        addRoute: 'Add to route',
        inRoute: 'In route',
        empty: 'No matching merchants',
        count: '{{visible}} / {{total}} merchants',
      },
    },
    routing: {
      badge: 'SMART ROUTING',
      title: 'Send every request to a better route',
      description:
        'Use explainable policies to evaluate availability, price, and latency, with smooth fallback when providers fail.',
      points: {
        policy: 'Combine cost, latency, and quality policies',
        fallback: 'Automatic degradation and fallback',
        explainable: 'Keep a clear reason for every decision',
      },
    },
    features: {
      badge: 'CAPABILITIES',
      title: 'Open, composable model infrastructure',
      description:
        'From health monitoring and channel comparison to policy routing, everything is transparent, self-hostable, and extensible.',
    },
    account: {
      title: 'Account',
      guestDescription: 'Log in to manage your profile, access tokens, and personal preferences.',
      loading: 'Loading your account…',
      signedInAs: 'Signed in as',
      login: 'Log in',
      register: 'Create account',
      logout: 'Log out',
      loadError: 'Your account could not be loaded',
      retry: 'Try again',
    },
  },
  auth: {
    login: {
      eyebrow: 'WELCOME BACK',
      title: 'Log in to ModelMesh',
      description:
        'Continue managing your model channels, routing policies, and health monitoring.',
      action: 'Log in',
      alternate: 'New to ModelMesh?',
      alternateAction: 'Create an account',
      registrationSuccess: 'Account created successfully. Log in with your new account.',
    },
    register: {
      eyebrow: 'GET STARTED',
      title: 'Create your ModelMesh account',
      description: 'Connect model channels and start building your own routing policies.',
      action: 'Create account',
      alternate: 'Already have an account?',
      alternateAction: 'Log in',
    },
    fields: {
      email: 'Email',
      emailPlaceholder: 'name@example.com',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      newPasswordPlaceholder: 'At least 8 characters',
    },
    submitting: 'Submitting…',
    session: {
      checking: 'Checking your session…',
      loadError: 'Your session could not be verified',
      retry: 'Try again',
    },
    errors: {
      invalidRequest: 'The request is incomplete. Check the form and try again.',
      invalidEmail: 'Enter a valid email address.',
      invalidPassword: 'Your password must be between 8 and 128 characters.',
      emailAlreadyExists: 'An account already exists for this email. Log in instead.',
      invalidCredentials: 'The email or password is incorrect.',
      unavailable: 'The backend service is unavailable. Try again shortly.',
      general: 'The operation failed. Please try again.',
    },
  },
} as const;
