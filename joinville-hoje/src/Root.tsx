import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {Boletim} from './Boletim';
import {linhaDoTempo, FPS} from './linha';
import type {Edicao} from './tipos';
import exemplo from './exemplo.json';

// A edição chega por props (scripts/render.mjs lê projetos/<data>/edicao.json); no estúdio abre o exemplo.
// A duração sai da própria edição: o tempo da narração (ou a estimativa, quando ainda não há narração).
type Props = {edicao: Edicao; guia?: boolean};
const medir: CalculateMetadataFunction<Props> = ({props}) => ({durationInFrames: linhaDoTempo(props.edicao).quadros});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Boletim" component={Boletim} width={1080} height={1920} fps={FPS} durationInFrames={900} defaultProps={{edicao: exemplo as Edicao}} calculateMetadata={medir} />
    <Composition id="BoletimGuia" component={Boletim} width={1080} height={1920} fps={FPS} durationInFrames={900} defaultProps={{edicao: exemplo as Edicao, guia: true}} calculateMetadata={medir} />
  </>
);
