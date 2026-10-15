// La contrasenya del panell (l'ADMIN_TOKEN) es guarda en aquest navegador. Abans
// de guardar-la es prova contra l'API: una de mal escrita no es queda guardada
// en silenci, i la pàgina diu de seguida si és bona o no.
// Cada pàgina posa el camp amb aquests ids: acces, token, token-ok, token-fb.
let token = localStorage.getItem("tatara:admin") || "";

async function provaToken(t) {
  const res = await fetch("/api/admin/historial?limit=1", { headers: { Authorization: `Bearer ${t}` } });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("error " + res.status);
  return true;
}

function avisToken(text, bo) {
  const fb = document.getElementById("token-fb");
  fb.textContent = text;
  fb.className = "feedback" + (bo === true ? " feedback--ok" : bo === false ? " feedback--error" : "");
}

// A stock i comandes el camp està amagat fins que cal.
function demanaToken(text) {
  document.getElementById("acces").hidden = false;
  avisToken(text, false);
  document.getElementById("token").focus();
}

// Lliga el camp i el botó. Si la contrasenya és bona, la guarda i crida entra().
function campToken(entra) {
  const input = document.getElementById("token");
  const boto = document.getElementById("token-ok");
  input.value = token;
  boto.addEventListener("click", async () => {
    const valor = input.value.trim();
    if (!valor) {
      localStorage.removeItem("tatara:admin");
      token = "";
      return avisToken("esborrada", true);
    }
    boto.disabled = true;
    avisToken("comprovant…");
    try {
      if (!(await provaToken(valor))) return avisToken("no és correcta: no s'ha guardat", false);
      localStorage.setItem("tatara:admin", valor);
      token = valor;
      avisToken("correcta ✓ guardada", true);
      if (entra) entra();
    } catch (err) {
      avisToken("no s'ha pogut comprovar (" + err.message + "): no s'ha guardat", false);
    } finally {
      boto.disabled = false;
    }
  });
  // Enter dins del camp fa el mateix que el botó.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") boto.click();
  });
}
