import MobileNav from "@/components/shared/MobileNav";
import { Navbar } from "@/components/shared/NavBar";
import Footer from "@/components/shared/footer";
import Head from "next/head";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaCheck, FaTimes, FaExclamationTriangle } from "react-icons/fa";

interface Server {
  url: string;
  altName: string;
}

interface ServerStatus {
  altName: string;
  status: string;
}

export default function Status() {
  const servers: Server[] = [
    { url: 'https://api.streamsora.live', altName: 'API' },
    { url: 'https://m3u8.streamsora.live/proxy/m3u8', altName: 'M3U8' },
    { url: 'https://streamsora.live', altName: 'Website' },
    { url: 'https://api.anify.tv', altName: 'Scraper' },
    { url: 'https://hanime-api-five.vercel.app', altName: 'Hanime API' },
    { url: 'https://image-proxy-zeta.vercel.app', altName: 'Image Proxy' },
    // Add more servers as needed
  ];

  const [serverStatusList, setServerStatusList] = useState<ServerStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const checkServerStatus = async () => {
      setIsChecking(true);

      const promises = servers.map(async ({ url, altName }) => {
        try {
          const response = await fetch(url);
          const status = response.ok ? 'Up' : 'Down';

          return { altName, status };
        } catch (error) {
          console.error(`Error checking server status for ${altName}:`, error);
          return { altName, status: 'Error' };
        }
      });

      Promise.all(promises)
          .then((results) => {
            setServerStatusList(results);
          })
          .catch((error) => {
            console.error("Error checking server statuses:", error);
          })
          .finally(() => {
            setIsChecking(false);
            setLastChecked(new Date());
          });
    };

    const rateLimitTimeout = 5000; // Set the rate limit to 5 seconds (adjust as needed)

    if (!isChecking) {
      setTimeout(checkServerStatus, rateLimitTimeout);
    }
  }, [servers, isChecking, serverStatusList]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Up':
        return <FaCheck className="text-green-500" />;
      case 'Down':
        return <FaTimes className="text-red-500" />;
      default:
        return <FaExclamationTriangle className="text-yellow-500" />;
    }
  };

  const renderServerStatus = () => {
    return serverStatusList.map(({ altName, status }, index) => (
        <div key={index} className="stat-box p-4 bg-[#101114] rounded flex items-center">
          <p className="text-lg font-bold">{altName}</p>
          <p className={`text-2xl font-semibold ml-auto ${status === 'Up' ? 'text-green-500' : (status === 'Error' ? 'text-yellow-500' : 'text-red-500')}`}>
            {getStatusIcon(status)} {status || 'Checking...'}
          </p>
        </div>
    ));
  };

  const pageVariants = {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
  };

  return (
      <>
        <motion.div initial="initial" animate="animate" variants={pageVariants} transition={{duration: 1}}
                    className="min-h-screen flex items-center justify-center text-white">
          <Head>
            <title>Streamsora - Status</title>
            <meta name="Status" content="Status"/>
          </Head>
          <>
            <Navbar withNav={true} scrollP={5} shrink={true}/>
            <MobileNav hideProfile={true}/>

            <motion.div className="w-full max-w-screen-lg p-8" initial={{scale: 0.8, opacity: 0}}
                        animate={{scale: 1, opacity: 1}} transition={{duration: 0.5, delay: 0.5}}>
              <h1 className="text-4xl font-bold text-center mb-6">Status</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[#ccc]">
                {renderServerStatus()}
              </div>
            </motion.div>
          </>
        </motion.div>
        {/*<Footer/>*/}
      </>
  );
}
