// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';

interface Server {
    url: string;
    altName: string;
}

interface ServerStatus {
    altName: string;
    status: string;
}

interface ErrorResponse {
    error: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ServerStatus[] | ErrorResponse>) {
    const servers: Server[] = [
        { url: 'https://api.streamsora.live', altName: 'API' },
        { url: 'https://m3u8.streamsora.live/proxy/m3u8', altName: 'M3U8' },
        { url: 'https://streamsora.live', altName: 'Website' },
        { url: 'https://anify.eltik.cc', altName: 'Scraper' },
        { url: 'https://hanime-api-five.vercel.app', altName: 'Hanime API' },
        { url: 'https://image-proxy-zeta.vercel.app', altName: 'Image Proxy' },
        // Add more servers as needed
    ];

    try {
        const serverStatusList: ServerStatus[] = await Promise.all(
            servers.map(async ({ url, altName }) => {
                try {
                    const response = await fetch(url);
                    const status = response.ok ? 'Up' : 'Down';
                    return { altName, status };
                } catch (error) {
                    console.error(`Error checking server status for ${altName}:`, error);
                    return { altName, status: 'Error' };
                }
            })
        );

        res.status(200).json(serverStatusList);
    } catch (error) {
        console.error("Error checking server statuses:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
