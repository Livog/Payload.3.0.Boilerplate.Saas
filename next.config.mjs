import { withPayload } from '@payloadcms/next/withPayload'
import initBundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = initBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withBundleAnalyzer(withPayload(nextConfig))
