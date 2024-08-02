import MobileNav from "@/components/shared/MobileNav";
import { Navbar } from "@/components/shared/NavBar";
import Footer from "@/components/shared/footer";
import Head from "next/head";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaVideo, FaBook, FaRegClock, FaKey } from "react-icons/fa";
import { BsFiletypeKey } from "react-icons/bs";

interface ApiData {
  anime: number;
  manga: number;
  novels: number;
  skipTimes: number;
  apiKeys: number;
}

interface ZoroData {
  key: number;
}

export default function Stats() {
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [zoroData, setZoroData] = useState<ZoroData | null>(null);

  useEffect(() => {
    fetchApiData("https://anify.eltik.cc/stats", setApiData);
    fetchApiData("https://zoro.anify.tv/key/4", setZoroData);
  }, []);

  const fetchApiData = async (url: string, setData: React.Dispatch<React.SetStateAction<any>>) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        console.error("Failed to fetch API data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching API data:", error);
    }
  };

  const renderStats = () => {
    if (!apiData) return null;
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[#ccc]">
          {Object.entries(apiData).map(([key, value], index) => (
              <div key={index} className={`stat-box p-4 bg-[#101114] rounded flex items-center`}>
                {renderStatIcon(key)}
                <p className="text-lg">{key}</p>
                <p className="text-2xl font-semibold ml-auto">{value}</p>
              </div>
          ))}
          {zoroData && (
              <div className={`stat-box p-4 bg-[#101114] rounded flex items-center`}>
                <BsFiletypeKey className="stat-icon mr-2 text-orange-500" />
                <p className="text-lg">Zoro Key</p>
                <p className="text-1x1 font-semibold ml-auto">{zoroData.key}</p>
              </div>
          )}

        </div>
    );
  };

  const renderStatIcon = (key: string) => {
    switch (key) {
      case "anime":
        return <FaVideo className="stat-icon mr-2 text-blue-500" />;
      case "manga":
        return <FaBook className="stat-icon mr-2 text-green-500" />;
      case "novels":
        return <FaBook className="stat-icon mr-2 text-red-500" />;
      case "skipTimes":
        return <FaRegClock className="stat-icon mr-2 text-purple-500" />;
      case "apiKeys":
        return <FaKey className="stat-icon mr-2 text-orange-500" />;
      default:
        return null;
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
  };

  return (
      <motion.div initial="initial" animate="animate" variants={pageVariants} transition={{ duration: 1 }} className="min-h-screen flex items-center justify-center text-white">
        <Head>
          <title>Kaizoku - Stats</title>
          <meta name="Stats" content="Stats" />
        </Head>
        <>
          <Navbar withNav={true} scrollP={5} shrink={true}/>
          <MobileNav hideProfile={true} />
          <motion.div className="w-full max-w-screen-lg p-8" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <h1 className="text-4xl font-bold text-center mb-6">Production Stats</h1>
            {renderStats()}
          </motion.div>
        </>
      </motion.div>
  );
}
