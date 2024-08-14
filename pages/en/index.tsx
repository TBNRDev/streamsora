import React from 'react';
import { aniListData } from "@/lib/anilist/AniList";
import { altData } from "@/lib/anilist/alt";
import { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import Link from "next/link";
import Footer from "@/components/shared/footer";
import Image from "next/image";
import Content from "@/components/home/content";
import styles from "./tabs.module.css";
import { AnimatePresence, motion } from "framer-motion";

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
import { ChevronLeftIcon, ChevronRightIcon } from "@vidstack/react/icons";

const MAX_TRENDS = 7;

export async function getServerSideProps() {
    let cachedData;

    if (redis) {
        cachedData = await redis.get("index_server");
    }

    if (cachedData) {
        const { genre, detail, populars, seasonal, nextSeasonal, popularMovies, trendingData } = JSON.parse(cachedData);
        const trendData = trendingData || {};
        const upComing = await getUpcomingAnime();
        return {
            props: {
                genre,
                detail,
                populars,
                seasonal,
                nextSeasonal,
                popularMovies,
                upComing,
                trendData,
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
        const seasonDetail = await aniListData({
            sort: "POPULARITY_DESC",
            season: "SUMMER",
            page: 1,
        });
        const nextSeasonDetail = await aniListData({
            sort: "POPULARITY_DESC",
            season: "FALL",
            page: 1,
        });
        const popularMovieDetail = await altData({
            sort: "POPULARITY_DESC",
            page: 1,
        });
        const genreDetail = await aniListData({ sort: "TYPE", page: 1 });

        if (redis) {
            const trendData = trendingDetail.props.data.slice(0, MAX_TRENDS) || [];
            await redis.set(
                "index_server",
                JSON.stringify({
                    genre: genreDetail.props,
                    detail: trendingDetail.props,
                    populars: popularDetail.props,
                    seasonal: seasonDetail.props,
                    nextSeasonal: nextSeasonDetail.props,
                    popularMovies: popularMovieDetail.props,
                    trendData: trendData,
                }), // set cache for 2 hours
                "EX",
                60 * 60 * 2
            );
        }

        const upComing = await getUpcomingAnime();
        const trendData = trendingDetail.props.data.slice(0, MAX_TRENDS) || [];


        return {
            props: {
                genre: genreDetail.props,
                detail: trendingDetail.props,
                populars: popularDetail.props,
                seasonal: seasonDetail.props,
                nextSeasonal: nextSeasonDetail.props,
                popularMovies: popularMovieDetail.props,
                upComing,
                trendData,
            },
        };
    }
}

type HomeProps = {
    genre: any;
    detail: any;
    populars: any;
    seasonal: any;
    nextSeasonal: any;
    popularMovies: any;
    upComing: any;
    trendData: any;
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
    seasonal,
    nextSeasonal,
    popularMovies,
    upComing,
    trendData,
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

    const [carouselIndex, setCarouselIndex] = useState<number>(0);
    const [isFading, setIsFading] = useState<boolean>(false);
    const maxTimeout: number = 15000; // 15 seconds

    const nextSlide = () => {
        setIsFading(true);
        setTimeout(() => {
            setCarouselIndex((prevIndex) => (prevIndex + 1) % trendData.length);
            setIsFading(false);
        }, 250);
    };

    const prevSlide = () => {
        setIsFading(true);
        setTimeout(() => {
            setCarouselIndex(
                (prevIndex) => (prevIndex - 1 + trendData.length) % trendData.length
            );
            setIsFading(false);
        }, 250);
    };

    const manualSlide = (index: number) => {
        setIsFading(true);
        setTimeout(() => {
            setCarouselIndex(index);
            setIsFading(false);
        }, 250);
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            nextSlide();
        }, maxTimeout);

        return () => {
            clearInterval(intervalId);
        };
    }, [carouselIndex]);

    const tabs = [
        {
            name: "Anime",
            label: "Anime",
        },
        {
            name: "Manga",
            label: "Manga",
        },
        {
            name: "My List",
            label: "Planned Watching",
        },
    ];

    const [activeTab, setActiveTab] = useState(tabs[0]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>, tab: { name: string; label: string; }) => {
        e.preventDefault();
        setActiveTab(tab);
    };

    const isSelected = (tab: { name: string; label: string; }) => activeTab.name === tab.name;

    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const searchUrl = `https://kaizoku.live/en/search/manga?search=${encodeURIComponent(searchTerm)}`;
        window.location.href = searchUrl;
    };

    return (
        <Fragment>
           <Head>
        <title>Kaizoku</title>
        <meta charSet="UTF-8"></meta>
        <link rel="icon" href="/kaizoku.png" />
        <link rel="canonical" href="https://kaizoku.live/en/" />
        <meta name="twitter:card" content="summary_large_image" />
        {/* Write the best SEO for this homepage */}
        <meta
          name="description"
          content="Unveil your next cherished anime or manga obsession! Kaizoku presents an expansive vault of premium content, conveniently available across various devices, guaranteeing uninterrupted enjoyment. Dive into the Kaizoku experience today and commence your journey into a world of limitless entertainment!"
        />
        <meta name="robots" content="index, follow" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://kaizoku.live/" />
        <meta
          name="twitter:title"
          content="Kaizoku: Your Gateway to Free Anime and Manga Streaming Delight"
        />
        <meta property="og:image" content="/kaizoku.png" />
        <meta property="og:site_name" content="Kaizoku" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Kaizoku - Free Anime and Manga Streaming"
        />
        <meta
          name="twitter:description"
          content="Embark on a journey to discover your next beloved anime or manga series! Kaizoku boasts an extensive collection of top-tier content, easily accessible across various devices, ensuring a seamless streaming experience devoid of any disruptions. Begin your Kaizoku adventure today and immerse yourself in the world of limitless entertainment!"
        />
        <meta name="twitter:image" content="/kaizoku.png" />
      </Head>
            <MobileNav hideProfile={true} />


            <div className="h-auto w-screen bg-[#000000] text-[#dbdcdd] relative z-40 overflow-x-hidden">
                <Navbar withNav toTop shrink bgHover scrollP={110} paddingY={"py-1"} />
                {/* PC / TABLET */}
                <section className="flex items-center bottom-1 top-[-5vh] justify-center h-screen relative -z-40">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: isFading ? 0 : 1, y: 0 }} // Fade out when fading
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.5 }}
                        className={`relative w-screen h-[90vh] z-20 ${isFading ? "opacity-0" : "opacity-100"
                            }`}
                    >
            {/* Banner content */}
            <Image
              src={
                trendData[carouselIndex]?.bannerImage
                  ? trendData[carouselIndex]?.bannerImage
                  : trendData[carouselIndex]?.coverImage.extraLarge
              }
              alt={`cover ${
                trendData[carouselIndex]?.title?.english ||
                trendData[carouselIndex]?.title?.romaji
              }`}
              width={245}
              height={300}
              priority
              className="absolute inset-0 object-cover w-full h-full bg-blend-overlay"
              style={{ filter: "brightness(0.4)" }} // Change brightness to x%
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col lg:flex-row justify-center items-center bg-gradient-to-t from-[#000000] to-transparent fade z-20"
            >
              {/* Left Side: Text Content */}
              <div className="flex flex-col justify-center items-start w-full lg:w-1/2 ml-[10%]">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="text-white text-2xl lg:text-3xl font-bold m-3"
                >
                  {trendData[carouselIndex]?.title?.english ||
                    trendData[carouselIndex]?.title?.romaji}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="h-[9rem] text-white whitespace-normal overflow-hidden max-w-[600px] text-xs md:text-sm mt-5 m-5 font-normal overflow-y-auto scrollbar-none"
                  dangerouslySetInnerHTML={{
                    __html: trendData[carouselIndex]?.description || "",
                  }}
                />
                <motion.div className="space-x-4 m-4">
                  {trendData && (
                    <motion.a
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.5 }}
                      href={`/en/anime/${trendData[carouselIndex]?.id || ""}`}
                      className="text-black px-3 py-2 text-md font-karla font-bold rounded bg-white transition-transform transform hover:scale-90"
                    >
                      START WATCHING
                    </motion.a>
                  )}
                  {/* Navigation Buttons */}
                  <motion.div className="flex gap-4 absolute bottom-[14%] md:bottom-[12%] left-[5%] md:left-[10%] items-center">
                    <div
                      className="bg-[#1e1e1e] p-2 rounded cursor-pointer"
                      onClick={() => prevSlide()}
                    >
                      <ChevronLeftIcon className="w-5 h-5 text-white" />
                    </div>
                    {/* Circle Indicators */}
                    <div className="flex gap-2">
                      {trendData.map((_: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => manualSlide(index)}
                          className={`w-8 h-1 rounded-full cursor-pointer ${
                            index === carouselIndex ? "bg-white" : "bg-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <div
                      className="bg-[#1e1e1e] p-2 rounded cursor-pointer"
                      onClick={() => nextSlide()}
                    >
                      <ChevronRightIcon className="w-5 h-5 text-white" />
                    </div>
                  </motion.div>
                </motion.div>
              </div>

                            {/* Right Side: Cover Image */}
                            <div className="flex justify-center items-center w-full lg:w-1/2">
                                <motion.a
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ duration: 0.5 }}
                                    href={`/en/anime/${trendData[carouselIndex]?.id || ""}`}
                                    className="rounded bg-none transition-transform transform hover:scale-90"
                                >
                                    <Image
                                        src={trendData[carouselIndex]?.coverImage.extraLarge}
                                        alt={trendData[carouselIndex]?.title.english}
                                        width={500}
                                        height={500}
                                        className="hidden lg:block w-[250px] h-[350px] object-cover rounded hover:scale-105 scale-100 transition-all duration-200 ease-out"
                                    />
                                </motion.a>
                            </div>
                        </motion.div>
                    </motion.div>
                </section>

                {sessions && (
                    <div className="flex items-center justify-center lg:bg-none mt-4 lg:mt-0 w-screen">
                        <div className="lg:w-[85%] w-screen px-5 lg:px-0 lg:text-4xl flex items-center gap-3 text-2xl font-bold font-Archivo">
                            {getGreetings() && (
                                <>
                                    {getGreetings()},
                                    <h1 className="lg:hidden">{sessions?.user.name}</h1>
                                </>
                            )}
                            <button
                                onClick={() => signOut()}
                                className="hidden text-center relative lg:flex justify-center group"
                            >
                                {sessions?.user.name}
                                <span className="absolute text-sm z-50 w-20 text-center bottom-11 text-white shadow-lg opacity-0 bg-secondary p-1 rounded-md font-Archivo font-light invisible group-hover:visible group-hover:opacity-100 duration-300 transition-all">
                                    Sign Out
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <div className={styles.tabHeader}>
                        {tabs.map((tab) => (
                            <div
                                key={tab.name}
                                className={[
                                    styles.tabItem,
                                    isSelected(tab) ? styles.selected : "",
                                ].join(" ")}
                            >
                                <button className="text-white px-3 py-2 text-md font-archivo font-bold rounded bg-black transition-transform transform hover:scale-90 flex items-center space-x-2" key={tab.name} onClick={(e) => handleClick(e, tab)}>
                                    {tab.label}
                                </button>
                                {isSelected(tab) && (
                                    <motion.div layoutId="indicator" className={styles.indicator} />
                                )}
                            </div>
                        ))}
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab.name || "empty"}
                            initial="initial"
                            animate="enter"
                            exit="exit"
                            transition={{
                                duration: 0.3,
                            }}
                        >
                            {activeTab && activeTab.name === "Anime" &&

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

                                        {recommendations.length > 0 && (
                                            <div className="space-y-4 lg:space-y-5 mb-5 lg:mb-10">
                                                <div className="px-5">
                                                    <p className="text-sm lg:text-base">
                                                        Based on Your List
                                                        <br />
                                                        <span className="font-Archivo text-[20px] lg:text-3xl font-bold">
                                                            Recommendations
                                                        </span>
                                                    </p>
                                                </div>
                                                <UserRecommendation data={recommendations} />
                                            </div>
                                        )}


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

                                        {/* SECTION 6 */}
                                        {seasonal && (
                                            <motion.section // Add motion.div to each child component
                                                key="Seasonal"
                                                initial={{ y: 20, opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                                whileInView={{ y: 0, opacity: 1 }}
                                                viewport={{ once: true }}
                                            >
                                                <Content
                                                    ids="Seasonal"
                                                    section="Trending This Season"
                                                    data={seasonal.data}
                                                />
                                            </motion.section>
                                        )}
                                        {/* SECTION 7 */}
                                        {nextSeasonal && (
                                            <motion.section // Add motion.div to each child component
                                                key="NextSeasonal"
                                                initial={{ y: 20, opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                                whileInView={{ y: 0, opacity: 1 }}
                                                viewport={{ once: true }}
                                            >
                                                <Content
                                                    ids="NextSeasonal"
                                                    section="Next Season"
                                                    data={nextSeasonal.data}
                                                />
                                            </motion.section>
                                        )}
                                        {/* SECTION 8 */}
                                        {popularMovies && (
                                            <motion.section // Add motion.div to each child component
                                                key="PopularMovies"
                                                initial={{ y: 20, opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                                whileInView={{ y: 0, opacity: 1 }}
                                                viewport={{ once: true }}
                                            >
                                                <Content
                                                    ids="PopularMovies"
                                                    section="Popular Movies"
                                                    data={popularMovies.data}
                                                />
                                            </motion.section>
                                        )}
                                    </motion.div></div>}

                            {activeTab.name === "Manga" && (
                                <div className={styles.detailscard}>        <section className="py-14 max-w-screen-xl mx-auto">
                                    <div className="relative overflow-hidden mx-4 px-4 py-14 rounded-2xl bg-blue-600 md:px-8 md:mx-8">
                                        <div className="relative z-10 max-w-xl mx-auto sm:text-center">
                                            <div className="space-y-3">

                                                <h3 className="text-3xl text-white font-bold">
                                                    Manga Discovery page isn't available for now
                                                </h3>
                                                <p className="text-blue-100 leading-relaxed">
                                                    Try searching for a manga instead.
                                                </p>
                                            </div>
                                            <div className="mt-6">
                                                <form
                                                    onSubmit={handleSubmit}
                                                    className="flex items-center justify-center bg-white rounded-lg p-1 sm:max-w-md sm:mx-auto"
                                                >
                                                    <input
                                                        type="search"
                                                        placeholder="Search any Manga"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="text-gray-500 w-full p-2 outline-none"
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="p-2 px-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 duration-150 outline-none shadow-md focus:shadow-none sm:px-4"
                                                    >
                                                        Search
                                                    </button>
                                                </form><p className="mt-3 max-w-lg text-[15px] text-blue-100 sm:mx-auto">
                                                    Enjoy! - kaizoku's Development Team
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 w-full h-full" style={{ background: "linear-gradient(268.24deg, rgba(59, 130, 246, 0.76) 50%, rgba(59, 130, 246, 0.545528) 80.61%, rgba(55, 48, 163, 0) 117.35%)" }}></div>
                                    </div>
                                </section>
                                </div>
                            )}
                            {activeTab.name === "My List" && (

                                <div className="lg:mt-16 mt-5 flex flex-col items-center">
                                    <motion.div
                                        className="w-screen flex-none lg:w-[95%] xl:w-[87%]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.5, staggerChildren: 0.2 }} // Add staggerChildren prop
                                    >
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
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
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