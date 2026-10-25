import React from 'react';
import {Composition, Folder} from 'remotion';
import {Capa} from './base/capa';
import {FPS as FPS_001, Overbooking, QUADROS as QUADROS_001} from './videos/overbooking/Overbooking';
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
    {/* v1.1: referência de física (andar, pular, cair, empilhar). Não é para postar. */}
    <Folder name="000-exemplo-fisica">
      <Composition id="ExemploFisica" component={ExemploFisica} width={1080} height={1920} fps={FPS_FIS} durationInFrames={QUADROS_FIS} />
    </Folder>
  </>
);
