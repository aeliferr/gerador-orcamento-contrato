function numberInFull(number) {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  
    function getCentenasDezenaUnidade(num) {
      let [centena, dezena, unidade] = String(num).padStart(3, '0').split('').map(Number);
  
      let extenso = "";
      if (centena === 1 && dezena === 0 && unidade === 0) {
        extenso += "cem";
      } else {
        extenso += centenas[centena];
        if (extenso && (dezena || unidade)) extenso += " e ";
      }
  
      if (dezena === 1) {
        extenso += especiais[unidade];
      } else {
        extenso += dezenas[dezena];
        if (dezena && unidade) extenso += " e ";
        extenso += unidades[unidade];
      }
  
      return extenso;
    }
  
    function getMilhares(num) {
      if (num < 1000) return "";
  
      let milhar = Math.floor(num / 1000);
      let resto = num % 1000;
  
      let extenso = "";
      if (milhar > 1) {
        extenso = `${getCentenasDezenaUnidade(milhar)} mil`;
      } else {
        extenso = "mil";
      }
  
      if (resto > 0) {
        extenso += " e " + getCentenasDezenaUnidade(resto);
      }
  
      return extenso;
    }
  
    return getMilhares(number) || getCentenasDezenaUnidade(number);
  }

  exports.numberInFull = numberInFull