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
| GB → United Kingdom
| EU → Eurozone
| CH → Switzerland
| NO → Norway
| SE → Sweden
| DK → Denmark
| US → United States
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
| The Revolut variation ID is optional while pricing is being configured.
| The billing service is responsible for rejecting checkout if a required
| variation has not been configured.
|
*/

export interface Price {
  amount: number;

  currency: string;

  revolutPlanVariationId?: string;
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
| The annual prices are intentionally lower than paying the monthly
| price for twelve months.
|
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 49.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 16.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 149.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 44.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 399.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 169.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1499.99,
        currency: "GBP",

        revolutPlanVariationId:
          process.env
            .REVOLUT_GB_ENTERPRISE_YEAR_VARIATION_ID,
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 49.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 16.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 149.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 44.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 399.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 169.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1499.99,
        currency: "EUR",

        revolutPlanVariationId:
          process.env
            .REVOLUT_EU_ENTERPRISE_YEAR_VARIATION_ID,
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 49.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 16.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 149.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 44.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 399.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 169.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1499.99,
        currency: "CHF",

        revolutPlanVariationId:
          process.env
            .REVOLUT_CH_ENTERPRISE_YEAR_VARIATION_ID,
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 599,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 189,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1699,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 499,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 4499,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 1899,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 16999,
        currency: "NOK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_NO_ENTERPRISE_YEAR_VARIATION_ID,
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 599,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 189,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1699,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 499,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 4499,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 1899,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 16999,
        currency: "SEK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_SE_ENTERPRISE_YEAR_VARIATION_ID,
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 399,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 125,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1099,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 325,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 2899,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 1250,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 10999,
        currency: "DKK",

        revolutPlanVariationId:
          process.env
            .REVOLUT_DK_ENTERPRISE_YEAR_VARIATION_ID,
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

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_STARTER_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 59.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_STARTER_YEAR_VARIATION_ID,
      },
    },

    PROFESSIONAL: {
      MONTH: {
        amount: 19.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_PROFESSIONAL_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 179.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_PROFESSIONAL_YEAR_VARIATION_ID,
      },
    },

    BUSINESS: {
      MONTH: {
        amount: 49.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_BUSINESS_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 449.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_BUSINESS_YEAR_VARIATION_ID,
      },
    },

    ENTERPRISE: {
      MONTH: {
        amount: 199.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_ENTERPRISE_MONTH_VARIATION_ID,
      },

      YEAR: {
        amount: 1699.99,
        currency: "USD",

        revolutPlanVariationId:
          process.env
            .REVOLUT_US_ENTERPRISE_YEAR_VARIATION_ID,
      },
    },
  },
};