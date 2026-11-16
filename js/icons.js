// Conjunto de ícones (traço, 24x24, estilo Lucide). Cada ícone: caminho SVG, categoria e palavras-chave (pt/en).
const I = (d, cat, tags) => ({ d, cat, tags });

export const ICONS = {
  'file-text': I('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M10 9H8 M16 13H8 M16 17H8', 'Arquivos', 'arquivo documento texto página file document page'),
  'folder': I('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z', 'Arquivos', 'pasta categoria seção folder'),
  'folder-open': I('m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2', 'Arquivos', 'pasta aberta open folder'),
  'book': I('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z', 'Arquivos', 'livro manual guia book guide'),
  'bookmark': I('m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z', 'Arquivos', 'marcador favorito bookmark'),
  'image': I('M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21', 'Mídia', 'imagem foto picture image'),
  'camera': I('M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'Mídia', 'câmera camera foto ip'),
  'video': I('m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5 M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'Mídia', 'vídeo video filme stream'),
  'tv': I('m17 2-5 5-5-5 M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z', 'Mídia', 'tv televisão tela'),
  'mic': I('M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3', 'Mídia', 'microfone áudio mic audio'),
  'headphones': I('M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3', 'Mídia', 'fone áudio headphones'),
  'play': I('M6 3l14 9-14 9z', 'Mídia', 'play iniciar reproduzir'),
  'wifi': I('M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01', 'Rede', 'wifi rede internet network wireless'),
  'radio': I('M4.9 19.1C1 15.2 1 8.8 4.9 4.9 M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5 M12 12h.01 M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5 M19.1 4.9C23 8.8 23 15.2 19.1 19.1', 'Rede', 'transmissão sinal antena broadcast radio'),
  'globe': I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z', 'Rede', 'globo web internet site globe'),
  'cloud': I('M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z', 'Rede', 'nuvem cloud'),
  'server': I('M20 2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z M20 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z M6 6h.01 M6 18h.01', 'Rede', 'servidor server host'),
  'link': I('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', 'Rede', 'link url endereço'),
  'monitor': I('M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M8 21h8 M12 17v4', 'Sistema', 'monitor computador pc informática screen'),
  'smartphone': I('M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z M12 18h.01', 'Sistema', 'celular telefone smartphone mobile'),
  'database': I('M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3z M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5 M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3', 'Sistema', 'banco dados database'),
  'terminal': I('m4 17 6-6-6-6 M12 19h8', 'Sistema', 'terminal comando console cli'),
  'code': I('m16 18 6-6-6-6 M8 6l-6 6 6 6', 'Sistema', 'código code dev'),
  'settings': I('M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6', 'Sistema', 'configurações ajustes settings sliders'),
  'wrench': I('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z', 'Sistema', 'ferramenta chave manutenção wrench tool'),
  'layers': I('m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12 M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17', 'Sistema', 'camadas layers'),
  'power': I('M12 2v10 M18.4 6.6a9 9 0 1 1-12.77.04', 'Sistema', 'ligar desligar power energia'),
  'zap': I('M13 2 3 14h9l-1 8 10-12h-9l1-8z', 'Sistema', 'raio energia zap rápido'),
  'lock': I('M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4', 'Segurança', 'cadeado senha lock segurança'),
  'shield': I('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'Segurança', 'escudo proteção shield'),
  'eye': I('M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'Segurança', 'olho ver visualizar eye view'),
  'users': I('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', 'Pessoas', 'usuários pessoas equipe users team'),
  'home': I('m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', 'Geral', 'início casa home'),
  'info': I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01', 'Geral', 'informação info detalhes'),
  'help': I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01', 'Geral', 'ajuda dúvida help faq pergunta'),
  'alert': I('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z M12 9v4 M12 17h.01', 'Geral', 'alerta aviso atenção warning alert'),
  'lightbulb': I('M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5 M9 18h6 M10 22h4', 'Geral', 'dica ideia lâmpada tip idea'),
  'star': I('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', 'Geral', 'estrela favorito star'),
  'heart': I('M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z', 'Geral', 'coração amor heart'),
  'bell': I('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0', 'Geral', 'sino notificação bell'),
  'clock': I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2', 'Geral', 'relógio hora tempo clock'),
  'calendar': I('M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'Geral', 'calendário data agenda calendar'),
  'map-pin': I('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'Geral', 'local mapa lugar pin map'),
  'mail': I('M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7', 'Geral', 'email e-mail carta mail'),
  'search': I('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3', 'Geral', 'buscar lupa search'),
  'folder-plus': I('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z M12 10v6 M9 13h6', 'Pastas', 'pasta nova adicionar folder plus'),
  'folder-check': I('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z m9 13 2 2 4-4', 'Pastas', 'pasta concluído ok folder check'),
  'folder-search': I('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z M11 14a2 2 0 1 0 0-.01 M13 16l1.5 1.5', 'Pastas', 'pasta buscar folder search'),
  'archive': I('M21 8v13H3V8 M1 3h22v5H1z M10 12h4', 'Pastas', 'arquivo morto caixa archive'),
  'box': I('M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7 12 12l8.7-5 M12 22V12', 'Pastas', 'caixa pacote box package'),
  'briefcase': I('M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M20 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z', 'Pastas', 'maleta trabalho pasta briefcase work'),
  'clipboard-check': I('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z M9 14l2 2 4-4', 'Pastas', 'checklist lista tarefas prancheta clipboard'),
  'layout': I('M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z', 'Pastas', 'painel layout dashboard'),
  'tag': I('M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M7.5 7.5h.01', 'Pastas', 'etiqueta tag rótulo'),
  'flag': I('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7', 'Pastas', 'bandeira marco flag'),
  'graduation-cap': I('M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z M22 10v6 M6 12.5V16a6 3 0 0 0 12 0v-3.5', 'Pastas', 'curso aprender treinamento tutorial graduation'),
  'cast': I('M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6 M2 12a9 9 0 0 1 8 8 M2 16a5 5 0 0 1 4 4 M2 20h.01', 'Mídia', 'transmitir espelhar cast'),
  'film': I('M19.82 2H4.18A2.18 2.18 0 0 0 2 4.18v15.64A2.18 2.18 0 0 0 4.18 22h15.64A2.18 2.18 0 0 0 22 19.82V4.18A2.18 2.18 0 0 0 19.82 2z M7 2v20 M17 2v20 M2 12h20 M2 7h5 M2 17h5 M17 17h5 M17 7h5', 'Mídia', 'filme cinema gravação film'),
  'volume': I('M11 5 6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14', 'Mídia', 'volume som áudio speaker'),
  'music': I('M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'Mídia', 'música louvor canto music'),
  'signal': I('M2 20h.01 M7 20v-4 M12 20v-8 M17 20V8 M22 4v16', 'Rede', 'sinal força signal'),
  'cpu': I('M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3', 'Sistema', 'processador chip computador cpu'),
  'hard-drive': I('M22 12H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z M6 16h.01 M10 16h.01', 'Sistema', 'disco hd armazenamento drive'),
  'printer': I('M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z', 'Sistema', 'impressora imprimir printer'),
  'plug': I('M12 22v-5 M9 8V2 M15 8V2 M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z', 'Sistema', 'tomada cabo energia plug'),
  'battery': I('M17 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z M23 13v-2', 'Sistema', 'bateria energia battery'),
  'key': I('m21 2-9.6 9.6 M7.5 15.5a5.5 5.5 0 1 0 0 .01z M15.5 7.5l3 3L22 7l-3-3', 'Segurança', 'chave senha key'),
  'cross': I('M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z', 'Pessoas', 'cruz igreja culto cross church'),
  'smile': I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01', 'Pessoas', 'sorriso feliz smile'),
  // Ícones de interface (não aparecem no seletor)
  'plus': I('M5 12h14 M12 5v14', null, ''),
  'x': I('M18 6 6 18 M6 6l12 12', null, ''),
  'check': I('M20 6 9 17l-5-5', null, ''),
  'chev-r': I('m9 18 6-6-6-6', null, ''),
  'chev-d': I('m6 9 6 6 6-6', null, ''),
  'grip': I('M9 5h.01 M9 12h.01 M9 19h.01 M15 5h.01 M15 12h.01 M15 19h.01', null, ''),
  'dots': I('M12 12h.01 M19 12h.01 M5 12h.01', null, ''),
  'trash': I('M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', null, ''),
  'pen': I('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', null, ''),
  'split': I('M3 3h7v18H3z M14 3h7v18h-7z', null, ''),
  'upload': I('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12', null, ''),
  'download': I('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3', null, ''),
  'branch': I('M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9', null, ''),
  'pr': I('M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M13 6h3a2 2 0 0 1 2 2v7 M6 9v12', null, ''),
  'copy': I('M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1', null, ''),
  'arrow-up': I('m5 12 7-7 7 7 M12 19V5', null, ''),
  'arrow-down': I('M12 5v14 M19 12l-7 7-7-7', null, ''),
  'arrow-left': I('m12 19-7-7 7-7 M19 12H5', null, ''),
  'arrow-right': I('M5 12h14 M12 5l7 7-7 7', null, ''),
  'external': I('M15 3h6v6 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', null, ''),
  'moon': I('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', null, ''),
  'sun': I('M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41', null, ''),
  'log-out': I('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9', null, ''),
  'list': I('M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01', null, ''),
  'list-ordered': I('M10 6h11 M10 12h11 M10 18h11 M4 6h1v4 M4 10h2 M6 18H4c0-1 2-2 2-3s-1-1.5-2-1', null, ''),
  'save': I('M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7 M7 3v4a1 1 0 0 0 1 1h7', null, ''),
  'shuffle': I('M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22 m18 2 4 4-4 4 M2 6h1.9c1.5 0 2.9.9 3.6 2.2 M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8 m18 14 4 4-4 4', null, ''),
  'menu': I('M4 6h16 M4 12h16 M4 18h16', null, ''),
  'github': I('M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4 M9 18c-4.51 2-5-2-7-2', null, ''),
};

export const ICON_COLORS = ['', '#3D6BF2', '#0EA5E9', '#14B8A6', '#16A34A', '#84CC16', '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#6B7280'];
export const CATEGORIES = ['Todos', 'Arquivos', 'Pastas', 'Mídia', 'Rede', 'Sistema', 'Segurança', 'Pessoas', 'Geral'];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Devolve HTML do ícone. `name` pode ser "emoji:😀". */
export function iconHtml(name, size = 16, color = 'currentColor', sw = 2) {
  if (typeof name === 'string' && name.startsWith('emoji:')) {
    return `<span class="emoji" style="font-size:${Math.round(size * 0.9)}px;line-height:${size}px;width:${size}px;height:${size}px">${esc(name.slice(6))}</span>`;
  }
  const ic = ICONS[name] || ICONS['file-text'];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${esc(color)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ic.d}"/></svg>`;
}

export function pickerIcons() {
  return Object.entries(ICONS).filter(([, v]) => v.cat).map(([name, v]) => ({ name, cat: v.cat, tags: `${name} ${v.tags}` }));
}
