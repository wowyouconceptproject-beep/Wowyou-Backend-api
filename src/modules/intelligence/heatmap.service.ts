import { prisma } from "../../lib/prisma";

export interface HeatmapCell {
  id: string;

  label: string;

  intensity: number;

  level:
    | "LOW"
    | "MODERATE"
    | "HIGH"
    | "CRITICAL";

  activity: number;

  checkIns: number;

  x: number;

  y: number;

  width: number;

  height: number;
}

export interface EventHeatmap {
  eventId: string;

  mode: "OPERATIONAL";

  generatedAt: string;

  cells: HeatmapCell[];

  legend: {
    min: number;
    max: number;
  };
}

function getLevel(
  value: number,
): HeatmapCell["level"] {
  if (value >= 85) {
    return "CRITICAL";
  }

  if (value >= 65) {
    return "HIGH";
  }

  if (value >= 35) {
    return "MODERATE";
  }

  return "LOW";
}

export async function getEventHeatmap(
  eventId: string,
): Promise<EventHeatmap> {
  const now =
    new Date();

  const since =
    new Date(
      now.getTime() -
        15 * 60_000,
    );

  /*
  |--------------------------------------------------------------------------
  | Load event + station activity
  |--------------------------------------------------------------------------
  */

  const [
    event,
    stations,
  ] = await Promise.all([
    prisma.event.findUnique({
      where: {
        id: eventId,
      },

      select: {
        id: true,

        capacity: true,

        currentOccupancy: true,
      },
    }),

    prisma.ticketCheckIn.groupBy({
      by: [
        "station",
      ],

      where: {
        purchase: {
          eventId,
        },

        checkedInAt: {
          gte: since,
        },
      },

      _count: {
        _all: true,
      },
    }),
  ]);

  if (!event) {
    throw new Error(
      "Event not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Operational Heatmap
  |--------------------------------------------------------------------------
  |
  | V1 uses station activity.
  |
  | This is intentionally NOT presented as
  | physical attendee positioning.
  |
  */

  const stationRows =
    stations.filter(
      (row) =>
        row.station &&
        row.station.trim()
          .length > 0,
    );

  const labels =
    stationRows.length >
    0
      ? stationRows.map(
          (row) =>
            row.station as string,
        )
      : [
          "Entrance",
          "Registration",
          "Main Operations",
          "Field",
        ];

  /*
  |--------------------------------------------------------------------------
  | Station counts
  |--------------------------------------------------------------------------
  */

  const counts =
    new Map(
      stationRows.map(
        (row) => [
          row.station as string,
          row._count._all,
        ],
      ),
    );

  const maxCount =
    Math.max(
      1,
      ...Array.from(
        counts.values(),
      ),
    );

  /*
  |--------------------------------------------------------------------------
  | Grid
  |--------------------------------------------------------------------------
  */

  const columns =
    4;

  const cellWidth =
    100 /
    columns;

  const rows =
    Math.ceil(
      labels.length /
        columns,
    );

  const cellHeight =
    100 /
    Math.max(
      rows,
      1,
    );

  const cells =
    labels.map(
      (
        label,
        index,
      ) => {
        const checkIns =
          counts.get(
            label,
          ) ?? 0;

        const intensity =
          Math.round(
            Math.min(
              100,
              (checkIns /
                maxCount) *
                100,
            ),
          );

        const row =
          Math.floor(
            index /
              columns,
          );

        const column =
          index %
          columns;

        return {
          id:
            `station-${index}`,

          label,

          intensity,

          level:
            getLevel(
              intensity,
            ),

          activity:
            checkIns,

          checkIns,

          x:
            column *
            cellWidth,

          y:
            row *
            cellHeight,

          width:
            cellWidth,

          height:
            cellHeight,
        };
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  return {
    eventId,

    mode:
      "OPERATIONAL",

    generatedAt:
      now.toISOString(),

    cells,

    legend: {
      min: 0,
      max: 100,
    },
  };
}