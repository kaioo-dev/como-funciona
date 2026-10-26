import React from 'react';
import {Composition, Folder} from 'remotion';
import {Capa} from './base/capa';
import {FPS as FPS_001, Overbooking, QUADROS as QUADROS_001} from './videos/overbooking/Overbooking';
import {FPS as FPS_002, Narguile, QUADROS as QUADROS_002} from './videos/narguile/Narguile';
import {EstudioJacare, FPS as FPS_JAC, QUADROS as QUADROS_JAC} from './videos/jacare/Estudio';
import {ExemploFisica, FPS as FPS_FIS, QUADROS as QUADROS_FIS} from './videos/exemplo-fisica/ExemploFisica';

// Registro dos vídeos. Cada vídeo novo ganha uma pasta (Folder) com:
//   <Nome>       versão final (com legenda e interface)
//   <Nome>Guia   mesma coisa + a área segura do Reels pintada (para conferir)
//   <Nome>Limpo  só a imagem 3D, sem textos (para tirar o fundo da capa)
//   Capa<Nome>   capa do Reels (1 quadro)
export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="001-overbooking">
      <Composition id="Overbooking" component={Overbooking} width={1080} height={1920} fps={FPS_001} durationInFrames={QUADROS_001} />
      <Composition id="OverbookingGuia" component={Overbooking} defaultProps={{guia: true}} width={1080} height={1920} fps={FPS_001} durationInFrames={QUADROS_001} />
      <Composition id="OverbookingLimpo" component={Overbooking} defaultProps={{semInterface: true}} width={1080} height={1920} fps={FPS_001} durationInFrames={QUADROS_001} />
      <Composition
        id="CapaOverbooking"
        component={Capa}
        defaultProps={{fundo: '001. overbooking/capa/fundo-limpo-escuro.jpg', tema: 'OVERBOOKING', linhas: ['O avião tem', '180 lugares.', 'Venderam', '190.'], destaque: 3, desce: 0}}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
      />
    </Folder>
    <Folder name="002-narguile">
      <Composition id="Narguile" component={Narguile} width={1080} height={1920} fps={FPS_002} durationInFrames={QUADROS_002} />
      <Composition id="NarguileGuia" component={Narguile} defaultProps={{guia: true}} width={1080} height={1920} fps={FPS_002} durationInFrames={QUADROS_002} />
      <Composition id="NarguileLimpo" component={Narguile} defaultProps={{semInterface: true}} width={1080} height={1920} fps={FPS_002} durationInFrames={QUADROS_002} />
      <Composition
        id="CapaNarguile"
        component={Capa}
        defaultProps={{fundo: '002. narguile/capa/fundo-limpo-escuro.jpg', tema: 'NARGUILÉ', linhas: ['O tabaco', 'não pega', 'fogo.'], destaque: 1, desce: 140}}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
      />
    </Folder>
    <Folder name="003-jacare">
      <Composition id="EstudioJacare" component={EstudioJacare} width={1080} height={1920} fps={FPS_JAC} durationInFrames={QUADROS_JAC} />
    </Folder>
    {/* v1.1: referência de física (andar, pular, cair, empilhar). Não é para postar. */}
    <Folder name="000-exemplo-fisica">
      <Composition id="ExemploFisica" component={ExemploFisica} width={1080} height={1920} fps={FPS_FIS} durationInFrames={QUADROS_FIS} />
    </Folder>
  </>
);
