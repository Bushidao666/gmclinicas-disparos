import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "*.supabase.co" },
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
			{ protocol: "https", hostname: "avatars.githubusercontent.com" },
		],
	},
	webpack: (config) => {
		config.resolve = config.resolve || {};
		config.resolve.fallback = {
			...(config.resolve.fallback || {}),
			fs: false,
			path: false,
			os: false,
			worker_threads: false,
		};
		return config;
	},
};

export default nextConfig;
