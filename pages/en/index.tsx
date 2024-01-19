import { aniListData } from "@/lib/anilist/AniList";
import { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import Link from "next/link";
import Footer from "@/components/shared/footer";
import Image from "next/image";
import Content from "@/components/home/content";

import { motion } from "framer-motion";

import { signOut, useSession } from "next-auth/react";
import Genres from "@/components/home/genres";
import Schedule from "@/components/home/schedule";
import getUpcomingAnime from "@/lib/anilist/getUpcomingAnime";

import GetMedia from "@/lib/anilist/getMedia";
import MobileNav from "@/components/shared/MobileNav";
import { getGreetings } from "@/utils/getGreetings";
import { redis } from "@/lib/redis";
import { Navbar } from "@/components/shared/NavBar";
import UserRecommendation from "@/components/home/recommendation";
import { useRouter } from "next/router";

export async function getServerSideProps() {
  let cachedData;

  if (redis) {
    cachedData = await redis.get("index_server");
  }

  if (cachedData) {
    const { genre, detail, populars, firstTrend } = JSON.parse(cachedData);
    const firstTrendData = firstTrend || {}; // Ensure firstTrend is not undefined
    const upComing = await getUpcomingAnime();

    return {
      props: {
        genre,
        detail,
        populars,
        upComing,
        firstTrend: firstTrendData,
      },
    };
  } else {
    const trendingDetail = await aniListData({
      sort: "TRENDING_DESC",
      page: 1,
    });
    const popularDetail = await aniListData({
      sort: "POPULARITY_DESC",
      page: 1,
    });
    const genreDetail = await aniListData({ sort: "TYPE", page: 1 });

    if (redis) {
      const firstTrendData = trendingDetail.props.data[0] || {};
      await redis.set(
        "index_server",
        JSON.stringify({
          genre: genreDetail.props,
          detail: trendingDetail.props,
          populars: popularDetail.props,
          firstTrend: firstTrendData,
        }),
        "EX",
        60 * 60 * 2
      );
    }

    const upComing = await getUpcomingAnime();
    const firstTrendData = trendingDetail.props.data[0] || {};

    return {
      props: {
        genre: genreDetail.props,
        detail: trendingDetail.props,
        populars: popularDetail.props,
        upComing,
        firstTrend: firstTrendData,
      },
    };
  }
}

type HomeProps = {
  genre: any;
  detail: any;
  populars: any;
  upComing: any;
  firstTrend: any;
};

export interface SessionTypes {
  name: string;
  picture: Picture;
  sub: string;
  token: string;
  id: number;
  image: Image;
  list: string[];
  version: string;
  iat: number;
  exp: number;
  jti: string;
}

interface Picture {
  large: string;
  medium: string;
}

interface Image {
  large: string;
  medium: string;
}

export default function Home({
  detail,
  populars,
  upComing,
  firstTrend,
}: HomeProps) {
  const { data: sessions }: any = useSession();
  const userSession: SessionTypes = sessions?.user;

  const {
    anime: currentAnime,
    manga: currentManga,
    recommendations,
  }: {
    anime: CurrentMediaTypes[];
    manga: CurrentMediaTypes[];
    recommendations: CurrentMediaTypes[];
  } = GetMedia(sessions, {
    stats: "CURRENT",
  });
  const { anime: plan }: { anime: CurrentMediaTypes[] } = GetMedia(sessions, {
    stats: "PLANNING",
  });
  const { anime: release } = GetMedia(sessions);

  const router = useRouter();

  const [schedules, setSchedules] = useState(null);
  const [anime, setAnime] = useState([]);

  const [recentAdded, setRecentAdded] = useState([]);

  async function getRecent() {
    const data = await fetch(`/api/v2/etc/recent/1`)
      .then((res) => res.json())
      .catch((err) => console.log(err));

    setRecentAdded(data?.results);
  }

  useEffect(() => {
    if (userSession?.version) {
      if (userSession?.version !== "1.0.1") {
        signOut({ redirect: true });
      }
    }
  }, [userSession?.version]);

  useEffect(() => {
    getRecent();
  }, []);

  const update = () => {
    setAnime((prevAnime) => prevAnime.slice(1));
  };

  useEffect(() => {
    if (upComing && upComing.length > 0) {
      setAnime(upComing);
    }
  }, [upComing]);

  const [releaseData, setReleaseData] = useState<any[]>([]);

  useEffect(() => {
    function getRelease() {
      let releasingAnime: any[] = [];
      let progress: any[] = [];
      let seenIds = new Set<number>(); // Create a Set to store the IDs of seen anime
      (release as any[]).forEach((list: any) => {
        list.entries.forEach((entry: any) => {
          if (
            entry.media.status === "RELEASING" &&
            !seenIds.has(entry.media.id)
          ) {
            releasingAnime.push(entry.media);
            seenIds.add(entry.media.id); // Add the ID to the Set
          }
          progress.push(entry);
        });
      });
      setReleaseData(releasingAnime);
      if (progress.length > 0) setProg(progress);
    }
    getRelease();
  }, [release]);

  const [listAnime, setListAnime] = useState<any[] | null>();
  const [listManga, setListManga] = useState<any[] | null>(null);
  const [planned, setPlanned] = useState<any[] | null>(null);
  const [user, setUser] = useState<any[] | null>(null);
  const [removed, setRemoved] = useState();

  const [prog, setProg] = useState<any[] | null>();

  const popular = populars?.data;

  useEffect(() => {
    async function userData() {
      try {
        if (userSession?.name) {
          await fetch(`/api/user/profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: sessions.user.name,
            }),
          });
        }
      } catch (error) {
        console.log(error);
      }
      let data: UserDataType | null = null;
      try {
        if (userSession?.name) {
          const res = await fetch(
            `/api/user/profile?name=${sessions.user.name}`
          );
          if (!res.ok) {
            switch (res.status) {
              case 404: {
                console.log("user not found");
                break;
              }
              case 500: {
                console.log("server error");
                break;
              }
              default: {
                console.log("unknown error");
                break;
              }
            }
          } else {
            data = await res.json();
            // Do something with the data
          }
        }
      } catch (error) {
        console.error(error);
        // Handle the error here
      }
      if (!data) {
        const dat: any = localStorage.getItem("artplayer_settings");
        if (dat) {
          const arr = Object.keys(dat).map((key: string) => dat[key] as any);
          const newFirst = arr?.sort((a: any, b: any) => {
            return (
              new Date(b?.createdAt).getTime() -
              new Date(a?.createdAt).getTime()
            );
          });

          const uniqueTitles = new Set();

          // Filter out duplicates and store unique entries
          const filteredData = newFirst.filter((entry: any) => {
            if (uniqueTitles.has(entry.aniTitle)) {
              return false;
            }
            uniqueTitles.add(entry.aniTitle);
            return true;
          });

          if (filteredData) {
            setUser(filteredData);
          }
        }
      } else {
        // Create a Set to store unique aniTitles
        const uniqueTitles = new Set();

        // Filter out duplicates and store unique entries
        const filteredData = data?.WatchListEpisode.filter((entry) => {
          if (uniqueTitles.has(entry.aniTitle)) {
            return false;
          }
          uniqueTitles.add(entry.aniTitle);
          return true;
        });
        setUser(filteredData);
      }
      // const data = await res.json();
    }
    userData();
  }, [userSession?.name, removed]);

  useEffect(() => {
    async function userData() {
      if (!userSession?.name) return;

      const getMedia =
        currentAnime.find((item) => item.status === "CURRENT") || null;
      const listAnime = getMedia?.entries
        .map(({ media }) => media)
        .filter((media) => media);

      const getManga =
        currentManga?.find((item) => item.status === "CURRENT") || null;
      const listManga = getManga?.entries
        .map(({ media }) => media)
        .filter((media) => media);

      const planned = plan?.[0]?.entries
        .map(({ media }) => media)
        .filter((media) => media);

      if (listManga) {
        setListManga(listManga);
      }
      if (listAnime) {
        setListAnime(listAnime);
      }
      if (planned) {
        setPlanned(planned);
      }
    }
    userData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSession?.name, currentAnime, plan]);

  function removeHtmlTags(text: string): string {
    return text?.replace(/<[^>]+>/g, "");
  }

  return (
    <Fragment>
      <Head>
        <title>Streamsora</title>
        <meta charSet="UTF-8"></meta>
        <link rel="icon" href="/streamsora.png" />
        <link rel="canonical" href="https://streamsora.live/en/" /><meta name="twitter:card" content="summary_large_image" />
        {/* Write the best SEO for this homepage */}
        <meta
          name="description"
          content="Unveil your next cherished anime or manga obsession! Streamsora presents an expansive vault of premium content, conveniently available across various devices, guaranteeing uninterrupted enjoyment. Dive into the Streamsora experience today and commence your journey into a world of limitless entertainment!"
        />
        <meta name="robots" content="index, follow" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://streamsora.live/" />
        <meta
          name="twitter:title"
          content="StreamSora: Your Gateway to Free Anime and Manga Streaming Delight"
        />
        <meta property="og:image" content="/streamsora.png" />
        <meta property="og:site_name" content="Streamsora" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Streamsora - Free Anime and Manga Streaming"
        />
        <meta
          name="twitter:description"
          content="Embark on a journey to discover your next beloved anime or manga series! Streamsora boasts an extensive collection of top-tier content, easily accessible across various devices, ensuring a seamless streaming experience devoid of any disruptions. Begin your Streamsora adventure today and immerse yourself in the world of limitless entertainment!"
        />
        <meta name="twitter:image" content="/streamsora.png" />
      </Head>
      <MobileNav hideProfile={true} />
      <Navbar withNav={true} home={true} />
      <div className="h-auto w-screen bg-[#141519] text-[#dbdcdd] relative overflow-hidden">
        {/* PC / TABLET */}
        <div className="flex items-center bottom-10 justify-center h-screen relative z-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
          >
            <Image
              src={firstTrend?.bannerImage}
              alt={`cover ${firstTrend?.title?.english || firstTrend?.title?.romaji}`}
              width={248}
              height={600}  // Adjust this value to your desired height
              priority
              className="absolute inset-0 object-cover w-full h-full bg-blend-overlay"
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col justify-end items-start bg-gradient-to-t from-[#12111a] to-transparent fade"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="text-white text-2xl lg:text-3xl font-bold m-3"
              >
                {firstTrend?.title?.english || firstTrend?.title?.romaji}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="h-[9.5rem] text-white whitespace-normal overflow-hidden overflow-ellipsis max-w-[600px] text-xs md:text-sm mt-15 m-5"
                dangerouslySetInnerHTML={{ __html: firstTrend?.description || '' }}
              />
              {firstTrend && (
                <motion.a
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  href={`/en/anime/${firstTrend?.id || ''}`}
                  className="rounded-sm rounded-tl-[4px] rounded-tr-[4px] rounded-bl-[4px] rounded-br-[4px] p-3 text-[#66ccff] border border-[#66ccff] hover:bg-[#66ccff] hover:text-white hover:ring-2 hover:ring-[#66ccff] transition-all duration-300 text-md font-karla font-light m-3"
                >
                  START WATCHING
                </motion.a>
              )}
            </motion.div>
          </motion.div>
        </div>

        <div className="lg:mt-16 mt-5 flex flex-col items-center">
          <motion.div
            className="w-screen flex-none lg:w-[95%] xl:w-[87%]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, staggerChildren: 0.2 }} // Add staggerChildren prop
          >
            {user && user?.length > 0 && user?.some((i) => i?.watchId) && (
              <motion.section // Add motion.div to each child component
                key="recentlyWatched"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="recentlyWatched"
                  section="Recently Watched"
                  userData={user}
                  userName={userSession?.name}
                  setRemoved={setRemoved}
                />
              </motion.section>
            )}

            {sessions && releaseData?.length > 0 && (
              <motion.section // Add motion.div to each child component
                key="onGoing"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="onGoing"
                  section="On-Going Anime"
                  data={releaseData}
                  og={prog}
                  userName={userSession?.name}
                />
              </motion.section>
            )}

            {sessions && listAnime && listAnime?.length > 0 && (
              <motion.section // Add motion.div to each child component
                key="listAnime"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="listAnime"
                  section="Your Watch List"
                  data={listAnime}
                  og={prog}
                  userName={userSession?.name}
                />
              </motion.section>
            )}

            {recommendations.length > 0 && (
              <div className="space-y-4 lg:space-y-5 mb-5 lg:mb-10">
                <div className="px-5">
                  <p className="text-sm lg:text-base">
                    Based on Your List
                    <br />
                    <span className="font-karla text-[20px] lg:text-3xl font-bold">
                      Recommendations
                    </span>
                  </p>
                </div>
                <UserRecommendation data={recommendations} />
              </div>
            )}

            {sessions && listManga && listManga?.length > 0 && (
              <motion.section // Add motion.div to each child component
                key="listManga"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="listManga"
                  section="Your Manga List"
                  data={listManga}
                  // og={prog}
                  userName={userSession?.name}
                />
              </motion.section>
            )}

            {/* SECTION 2 */}
            {sessions && planned && planned?.length > 0 && (
              <motion.section // Add motion.div to each child component
                key="plannedAnime"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="plannedAnime"
                  section="Your Plan"
                  data={planned}
                  userName={userSession?.name}
                />
              </motion.section>
            )}
          </motion.div>

          <motion.div
            className="w-screen flex-none lg:w-[95%] xl:w-[87%]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, staggerChildren: 0.2 }} // Add staggerChildren prop
          >
            {/* SECTION 3 */}
            {recentAdded?.length > 0 && (
              <motion.section // Add motion.div to each child component
                key="recentAdded"
                initial={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.5 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="recentAdded"
                  section="Freshly Added"
                  data={recentAdded}
                />
              </motion.section>
            )}

            {/* SECTION 4 */}
            {detail && (
              <motion.section // Add motion.div to each child component
                key="trendingAnime"
                initial={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.5 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="trendingAnime"
                  section="Trending Now"
                  data={detail.data}
                />
              </motion.section>
            )}
            {/* <div className="w-full h-[150px] bg-white flex-center my-5 text-black">
              ad banner
            </div> */}

            {/* Schedule */}
            {anime.length > 0 && (
              <motion.section // Add motion.div to each child component
                key="schedule"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Schedule
                  data={anime[0]}
                  anime={anime}
                  update={update}
                  scheduleData={schedules}
                />
              </motion.section>
            )}

            {/* SECTION 5 */}
            {popular && (
              <motion.section // Add motion.div to each child component
                key="popularAnime"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Content
                  ids="popularAnime"
                  section="Popular Anime"
                  data={popular}
                />
              </motion.section>
            )}

            <motion.section // Add motion.div to each child component
              key="Genres"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Genres />
            </motion.section>
          </motion.div>
        </div>
      </div>
      <Footer />
    </Fragment>
  );
}

export interface CurrentMediaTypes {
  status?: string;
  name: string;
  entries: Entry[];
}

export interface Entry {
  id: number;
  mediaId: number;
  status: string;
  progress: number;
  score: number;
  media: Media;
}

export interface Media {
  id: number;
  status: string;
  nextAiringEpisode: any;
  title: Title;
  episodes: number;
  coverImage: CoverImage;
}

export interface Title {
  english: string;
  romaji: string;
}

export interface CoverImage {
  large: string;
}

export interface UserDataType {
  id: string;
  name: string;
  setting: Setting;
  WatchListEpisode: WatchListEpisode[];
}

export interface Setting {
  CustomLists: boolean;
}

export interface WatchListEpisode {
  id: string;
  aniId?: string;
  title?: string;
  aniTitle?: string;
  image?: string;
  episode?: number;
  timeWatched?: number;
  duration?: number;
  provider?: string;
  nextId?: string;
  nextNumber?: number;
  dub?: boolean;
  createdDate: string;
  userProfileId: string;
  watchId: string;
}


