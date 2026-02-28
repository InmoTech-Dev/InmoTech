# 🚀 Diccionario Git: De Novato a Pro (Sin miedos)

Esta guía tiene todo lo que necesitas para trabajar con tus amigos en GitHub sin romper nada.

---

## 1. Los 3 Comandos del Día a Día

Usa estos cada vez que termines de programar un ratico.

1.  **`git status`**: El "Chismoso". Te dice qué archivos cambiaste y si Git los está vigilando. Úsalo SIEMPRE antes de cualquier otro comando.
2.  **`git add .`**: "La Maleta". Metes todos tus cambios en una maleta lista para ser guardada.
3.  **`git commit -m "Explicación"`**: "El Candado". Cierras la maleta con una etiqueta que dice qué hiciste. (Ej: `git commit -m "Arreglé el botón de login"`).
4.  **`git push origin Pepi`**: "El Camión". Envía tus maletas cerradas al servidor de internet (GitHub).

---

## 2. El Flujo Seguro (Para no borrar lo de tus amigos)

Cuando quieras llevar tus cosas a la rama común (`Develop`):

1.  **Ve a Develop:** `git checkout Develop`
2.  **Trae lo nuevo:** `git pull origin Develop` (Traes las maletas que tus amigos subieron).
3.  **Une tu trabajo:** `git merge Pepi` (Metes tus cosas en la rama Develop local).
4.  **Sube al servidor:** `git push origin Develop`

---

## 3. ¿Qué hacer si "metí la pata"? 🛠️

- **"Borré algo por accidente y quiero volver a como estaba":**
  ```bash
  git restore ruta/del/archivo.js
  ```
- **"Hice un commit pero me equivoqué de mensaje":**
  ```bash
  git commit --amend -m "Nuevo mensaje correcto"
  ```
- **"Quiero deshacer mi último commit pero NO borrar mi código":**
  ```bash
  git reset --soft HEAD~1
  ```
- **"¡AUXILIO! Nada funciona y quiero borrar todo lo que hice hoy (Cuidado):"**
  ```bash
  git reset --hard origin/Develop
  ```

---

## 4. Ramas: Tus universos paralelos 🌌

- **Ver en qué rama estás:** `git branch`
- **Crear una rama nueva (para una idea nueva):** `git checkout -b MiNuevaIdea`
- **Borrar una rama que ya no usas:** `git branch -d NombreDeRama`

---

## 5. El Baúl de Emergencia (`Stash`) 📦

Úsalo cuando estás a mitad de algo, pero tienes que cambiar de rama rápido y no quieres perder lo incompleto.

1.  **Guardar en el baúl:** `git stash` (Tus archivos vuelven a estar limpios).
2.  **Cambiar de rama, hacer lo que sea, y volver a tu rama.**
3.  **Sacar del baúl:** `git stash pop` (Tus cambios incompletos regresan mágicamente).

---

## 6. Diccionario Rápido de GitHub 📖

- **`origin`**: Es el nombre que Git le da a tu proyecto en internet (GitHub).
- **`main` / `master`**: La rama principal, donde está la versión "final" que ven los clientes.
- **`Develop`**: Donde ustedes están trabajando y probando cosas.
- **`Pull Request` (PR)**: Es una petición en la web de GitHub para que tus amigos revisen tu código antes de que se una a Develop. ¡Úsenlo para aprender entre ustedes!
- **`Conflictos`**: Cuando dos personas cambian la misma línea al mismo tiempo. Git se confunde y te pide que elijas cuál versión es mejor.

---

## 7. Consejos para trabajar en grupo 🤝

1.  **Hablen mucho:** "Oigan, voy a tocar el Login, no lo toquen ustedes".
2.  **Pull antes de Push:** Siempre trae lo de los demás antes de intentar subir lo tuyo.
3.  **Nombres claros:** No pongas `git commit -m "asd"`. Pon algo útil como `git commit -m "Corregido error en base de datos"`.
