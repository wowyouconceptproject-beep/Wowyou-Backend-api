import {
  OrganizerPlan,
} from "@prisma/client";

/*
|--------------------------------------------------------------------------
| Billing Interval
|--------------------------------------------------------------------------
*/

export type BillingInterval =
  | "MONTH"
  | "YEAR";

/*
|--------------------------------------------------------------------------
| Billing Country
|--------------------------------------------------------------------------
|
| WOWYOU is positioned as a European / international
| event technology platform.
|
| GB â†’ United Kingdom
| EU â†’ Eurozone
| CH â†’ Switzerland
| NO â†’ Norway
| SE â†’ Sweden
| DK â†’ Denmark
| US â†’ United States
|
*/

export type BillingCountry =
  | "GB"
  | "EU"
  | "CH"
  | "NO"
  | "SE"
  | "DK"
  | "US";

/*
|--------------------------------------------------------------------------
| Price
|--------------------------------------------------------------------------
|
| Each price represents one specific:
|
| country + plan + billing interval
|
| revolutPlanVariationId:
| - Used ONLY by the backend
| - Never returned to the frontend
| - Resolved from Railway environment variables
|
*/

export interface Price {
  amount: number;

  currency: string;
}

/*
|--------------------------------------------------------------------------
| Plan Pricing
|--------------------------------------------------------------------------
*/

export interface PlanPricing {
  MONTH: Price;

  YEAR: Price;
}

/*
|--------------------------------------------------------------------------
| Organizer Pricing
|--------------------------------------------------------------------------
|
| YEAR = annual billing price
|
| MONTH = monthly billing price
|
| The annual prices are intentionally lower than paying
| the monthly price for twelve months.
|
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
|
| The frontend does NOT need to know the Stripe recurring Price.
|
| The backend uses:
|
| country
|    +
| plan
|    +
| interval
|
| to resolve:
|
| amount
| currency
| Stripe recurring Price
|
|--------------------------------------------------------------------------
*/

export const ORGANIZER_PRICING: Record<
  BillingCountry,
  Record<
    OrganizerPlan,
    PlanPricing
  >
> = {

  /*
  |--------------------------------------------------------------------------
  | United Kingdom
  |--------------------------------------------------------------------------
  */

  GB: {

    STARTER: {
      MONTH: {
        amount: 5.99,
        currency: "GBP",
      },

      YEAR: {
        amount: 49.99,
        currency: "GBP",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 16.99,
        currency: "GBP",
      },

      YEAR: {
        amount: 149.99,
        currency: "GBP",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 44.99,
        currency: "GBP",
      },

      YEAR: {
        amount: 399.99,
        currency: "GBP",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 169.99,
        currency: "GBP",
      },

      YEAR: {
        amount: 1499.99,
        currency: "GBP",
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | European Union / Eurozone
  |--------------------------------------------------------------------------
  */

  EU: {

    STARTER: {
      MONTH: {
        amount: 5.99,
        currency: "EUR",
      },

      YEAR: {
        amount: 49.99,
        currency: "EUR",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 16.99,
        currency: "EUR",
      },

      YEAR: {
        amount: 149.99,
        currency: "EUR",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 44.99,
        currency: "EUR",
      },

      YEAR: {
        amount: 399.99,
        currency: "EUR",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 169.99,
        currency: "EUR",
      },

      YEAR: {
        amount: 1499.99,
        currency: "EUR",
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Switzerland
  |--------------------------------------------------------------------------
  */

  CH: {

    STARTER: {
      MONTH: {
        amount: 5.99,
        currency: "CHF",
      },

      YEAR: {
        amount: 49.99,
        currency: "CHF",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 16.99,
        currency: "CHF",
      },

      YEAR: {
        amount: 149.99,
        currency: "CHF",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 44.99,
        currency: "CHF",
      },

      YEAR: {
        amount: 399.99,
        currency: "CHF",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 169.99,
        currency: "CHF",
      },

      YEAR: {
        amount: 1499.99,
        currency: "CHF",
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Norway
  |--------------------------------------------------------------------------
  */

  NO: {

    STARTER: {
      MONTH: {
        amount: 69,
        currency: "NOK",
      },

      YEAR: {
        amount: 599,
        currency: "NOK",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 189,
        currency: "NOK",
      },

      YEAR: {
        amount: 1699,
        currency: "NOK",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 499,
        currency: "NOK",
      },

      YEAR: {
        amount: 4499,
        currency: "NOK",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 1899,
        currency: "NOK",
      },

      YEAR: {
        amount: 16999,
        currency: "NOK",
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Sweden
  |--------------------------------------------------------------------------
  */

  SE: {

    STARTER: {
      MONTH: {
        amount: 69,
        currency: "SEK",
      },

      YEAR: {
        amount: 599,
        currency: "SEK",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 189,
        currency: "SEK",
      },

      YEAR: {
        amount: 1699,
        currency: "SEK",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 499,
        currency: "SEK",
      },

      YEAR: {
        amount: 4499,
        currency: "SEK",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 1899,
        currency: "SEK",
      },

      YEAR: {
        amount: 16999,
        currency: "SEK",
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Denmark
  |--------------------------------------------------------------------------
  */

  DK: {

    STARTER: {
      MONTH: {
        amount: 45,
        currency: "DKK",
      },

      YEAR: {
        amount: 399,
        currency: "DKK",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 125,
        currency: "DKK",
      },

      YEAR: {
        amount: 1099,
        currency: "DKK",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 325,
        currency: "DKK",
      },

      YEAR: {
        amount: 2899,
        currency: "DKK",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 1250,
        currency: "DKK",
      },

      YEAR: {
        amount: 10999,
        currency: "DKK",
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | United States
  |--------------------------------------------------------------------------
  */

  US: {

    STARTER: {
      MONTH: {
        amount: 6.99,
        currency: "USD",
      },

      YEAR: {
        amount: 59.99,
        currency: "USD",
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 19.99,
        currency: "USD",
      },

      YEAR: {
        amount: 179.99,
        currency: "USD",
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 49.99,
        currency: "USD",
      },

      YEAR: {
        amount: 449.99,
        currency: "USD",
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 199.99,
        currency: "USD",
      },

      YEAR: {
        amount: 1699.99,
        currency: "USD",
      },
    },
  },
};
