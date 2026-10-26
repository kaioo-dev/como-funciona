import {Config} from '@remotion/cli/config';

Config.setCodec('h264');
Config.setVideoImageFormat('jpeg');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
// Tudo que está em projetos/ pode ser usado com staticFile('<AAAA-MM-DD>/...').
Config.setPublicDir('projetos');
Config.setCachingEnabled(false);
