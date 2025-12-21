import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import axios from 'axios';

document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite logo to learn more
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))

const app = document.querySelector('#app');

let AllPokemonData = [];//全ポケモンデータ保存用

// ポケモンの詳細を表示する関数
async function showDetail(url) {
  try {
    app.innerHTML = '<p>読み込み中...</p>';
    const response = await axios.get(url);
    const pokemon = response.data;
    const cryUrl = pokemon.cries.latest;//鳴き声API

    // 1. 日本語名の取得
    const speciesResponse = await axios.get(pokemon.species.url);
    const japaneseName = speciesResponse.data.names.find(
      (name) => name.language.name === 'ja-Hrkt'
    ).name;

    // 2. タイプの日本語化（辞書を使わずにAPIから直接取得）
    // タイプの数だけ「調べもの係」を派遣して、全員戻るのを待ちます
    const japaneseTypes = await Promise.all(
      pokemon.types.map(async (t) => {
        const typeDetail = await axios.get(t.type.url); // 各タイプのURLへアクセス
        const jaType = typeDetail.data.names.find(
          (n) => n.language.name === 'ja-Hrkt'
        ).name;
        return jaType;
      })
    );

    const imageUrl = pokemon.sprites.other['official-artwork'].front_default;

    // 3. プリロード処理
    await new Promise((resolve) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    // 詳細画面のHTMLを作成
    app.innerHTML = `
      <div class="detail-card">
        <h1>No.${pokemon.id} : ${japaneseName}</h1>
        <img src="${imageUrl}" alt="${japaneseName}"/>
        <p>高さ：${pokemon.height / 10} m</p>
        <p>重さ：${pokemon.weight / 10} kg</p>
        <p>タイプ：${japaneseTypes.join(' / ')}</p>

        <button id="cry-btn">なきごえを聴く 🔊</button>
      
        <br><br>
        <button id="back-btn">戻る</button>
      </div>
    `;

    //鳴き声ボタン
    document.getElementById('cry-btn').addEventListener('click', () => {
      const audio = new Audio(cryUrl);
      audio.volume = 0.5;
      audio.play();
    });

    //戻るボタン
    document.getElementById('back-btn').addEventListener('click', () => {
      fetchAllPokemon();
    });

  } catch (error) {
    console.error(error);
    app.innerHTML = '<p>詳細の取得中にエラーが発生しました。</p>';
  }
}

// ポケモン一覧を取得して表示する関数
async function fetchAllPokemon() {
  try {
    if(AllPokemonData.length === 0){
      app.innerHTML = '<p>読み込み中...</p>';

    // 1. 151匹分の「種族データ（名前の宝庫）」を一気に取得
    const speciesListResponse = await axios.get('https://pokeapi.co/api/v2/pokemon-species?limit=151');
    const pokemonResponse = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
    const speciesData = speciesListResponse.data.results;
    const pokemonList = pokemonResponse.data.results;   
    // 2. 151匹分の詳細（日本語名）を並列で取得して整理する
    // ※ここが少し高度ですが、一気に通信して日本語名の配列を作ります
    AllPokemonData = await Promise.all(
      speciesData.map(async (s, index) => {
        const res = await axios.get(s.url);
        const nameJP = res.data.names.find(n => n.language.name === 'ja-Hrkt').name;
        
        return {
          jpName: nameJP,
          url: pokemonList[index].url,
          id: index + 1
        };
      })
    );
  }
    // 3. 画面に表示する
    app.innerHTML = `
    <div class="search-container">
      <input type="text" id="search-input" placeholder="ポケモンを検索..."/>
    </div>
    <div id="list-container" class="pokemon-grid"></div>
    `;

    const searchInput = document.getElementById('search-input');

    //4. 検索機能の実装
    searchInput.addEventListener('input', (e) => {
      const word = e.target.value;
      //倉庫の中から名前が一致するもの多だけを絞り込む
      const filtered = AllPokemonData.filter(p => p.jpName.includes(word));
      renderGrid(filtered);//グリッドだけを書き換える
    });

    //最初は全員表示
    renderGrid(AllPokemonData);

  } catch (error) {
    console.error(error);
    app.textContent = '取得エラーが発生しました';
  }
}

//list部分だけを描画する専用の関数
function renderGrid(list) {
  const container = document.getElementById('list-container');
  container.innerHTML = '';//一旦クリア

  list .forEach((pokemon) => {
    const pokemonCard = document.createElement('div');
    pokemonCard.className = 'pokemon-card';
    pokemonCard.innerHTML = `
      <button class="detail-btn">
        <h2>${pokemon.jpName}</h2>
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png"
         alt="${pokemon.jpName}" loading="lazy"/>
      </button>
    `;
    //詳細ボタンのイベント
    pokemonCard.querySelector('.detail-btn').addEventListener('click', () => {
      showDetail(pokemon.url);
    });
    container.appendChild(pokemonCard);
  });
}

//最後に実行
fetchAllPokemon();