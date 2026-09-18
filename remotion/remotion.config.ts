import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Brand videos are gradient- and blur-heavy; CRF 18 keeps the gold accent
// clean without ballooning file size for social upload.
Config.setCrf(18);
Config.setConcurrency(4);
