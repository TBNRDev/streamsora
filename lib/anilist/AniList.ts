type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export async function aniListData({ sort, season, seasonYear, page = 1 }: { sort: any; season?: MediaSeason; seasonYear?: number; page?: number }) {
  const variables: any = {
    page: page,
    perPage: 15,
    sort,
  };

  if (season) {
    variables.season = season;
  }
  if (seasonYear) {
    variables.seasonYear = seasonYear;
  } else {
    variables.seasonYear = new Date().getFullYear(); // Use current year as fallback
  }

  console.log("Variables sent to AniList API:", variables);

  try {
    const resAnilist = await fetch(`https://graphql.anilist.co`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query (
            $id: Int
            $page: Int
            $perPage: Int
            $search: String
            $sort: [MediaSort]
            $season: MediaSeason
            $seasonYear: Int
          ) {
            Page(page: $page, perPage: $perPage) {
              pageInfo {
                total
                currentPage
                lastPage
                hasNextPage
                perPage
              }
              media(season: $season, seasonYear: $seasonYear, id: $id, search: $search, sort: $sort, type: ANIME) {
                id
                idMal
                status
                title {
                  romaji
                  english
                }
                bannerImage
                coverImage {
                  extraLarge
                  color
                }
                description
              }
            }
          }
        `,
        variables,
      }),
    });

    const anilistData = await resAnilist.json();

    // Log the entire response for debugging
    console.log("AniList API response:", anilistData);

    if (!anilistData.data || !anilistData.data.Page) {
      throw new Error("Invalid response from AniList API");
    }

    const data = anilistData.data.Page.media;

    return {
      props: {
        data,
      },
    };
  } catch (error) {
    console.error("Error fetching data from AniList API:", error);
    return {
      props: {
        data: [],
      },
    };
  }
}