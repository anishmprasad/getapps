/* =====================================================================
   GetJSON — /dashboard : endpoints created on this device, plus the ones
   tied to your account when you are signed in.
   ===================================================================== */
(function () {
  "use strict";
  var $ = GA.$, $$ = GA.$$;

  document.addEventListener("DOMContentLoaded", function () {
    var host = $("[data-dashboard]");
    if (!host) return;

    var authSlot = $("[data-auth-slot]");
    var currentUser = null;

    GJ.auth.onChange(function (user) {
      currentUser = user;
      if (authSlot && window.GJrenderAuth) GJrenderAuth(authSlot, user);
      load();
    });

    async function load() {
      host.innerHTML = '<div class="panel panel--pad" style="text-align:center;color:var(--muted)"><p>Loading…</p></div>';

      var local = GJ.api.localBins();
      var mine = null, mineError = "";
      if (currentUser) {
        try { mine = await GJ.api.myBins(); }
        catch (e) { mineError = e.message; }
      }

      var html = "";

      /* --- account section --- */
      if (currentUser) {
        html += section(
          "Saved to your account",
          "Signed in as " + esc(currentUser.email || "your account") +
            ". These live for up to six days and are managed here — no edit token needed.",
          mine && mine.length
            ? table(mine.map(function (b) {
                return { id: b.id, name: b.name, expiresAt: b.expires_at, createdAt: b.created_at,
                         views: b.views, size: b.size_bytes, owned: true };
              }))
            : mineError
              ? '<div class="empty">Could not load your endpoints: ' + esc(mineError) + "</div>"
              : '<div class="empty">Nothing saved to this account yet. Anything you publish while signed in appears here.</div>'
        );
      } else {
        html += '<div class="signincard">' +
          "<div><b>Sign in to keep a list</b>" +
          "<p>Endpoints published while signed in last up to six days instead of three, are listed here on any device, and can be deleted without an edit token.</p></div>" +
          '<div data-auth-inline></div></div>';
      }

      /* --- device section --- */
      html += section(
        "Created on this device",
        local.length
          ? "Tracked in this browser's local storage, including the ones you published without an account. Clearing site data loses this list — it does not delete the endpoints."
          : "Nothing here yet.",
        local.length
          ? table(local.map(function (b) {
              return { id: b.id, name: b.name, expiresAt: b.expiresAt, createdAt: b.createdAt,
                       editToken: b.editToken, demo: b.demo };
            }))
          : '<div class="empty">Publish something on <a href="/">the editor</a> and it will show up here.</div>'
      );

      host.innerHTML = html;

      var inline = $("[data-auth-inline]", host);
      if (inline && window.GJrenderAuth) GJrenderAuth(inline, null);

      $$("[data-copy]", host).forEach(function (b) {
        b.addEventListener("click", function () { GA.copy(b.dataset.copy, "URL copied"); });
      });
      $$("[data-del]", host).forEach(function (b) {
        b.addEventListener("click", async function () {
          b.disabled = true;
          try {
            await GJ.api.remove(b.dataset.del, b.dataset.token || "");
            GA.toast("Deleted");
            load();
          } catch (e) { GA.toast(e.message, "err"); b.disabled = false; }
        });
      });
      if (window.GJcountdown) GJcountdown(host);
      if (window.GAds) GAds.refresh(host);
    }

    function section(title, sub, body) {
      return '<section class="dsec"><div class="dsec__head"><h2>' + title + "</h2><p>" + sub + "</p></div>" + body + "</section>";
    }

    function table(rows) {
      return '<div class="table-scroll"><table class="tbl"><thead><tr>' +
        "<th>Endpoint</th><th>Created</th><th>Expires</th>" +
        (rows[0].views !== undefined ? "<th>Views</th>" : "") +
        "<th></th></tr></thead><tbody>" +
        rows.map(function (r) {
          var url = GJ.api.urlFor(r.id);
          return "<tr>" +
            '<td><span class="bank"><b>' + (r.name ? esc(r.name) : "") + "</b>" +
              '<code class="idchip">' + esc(r.id) + "</code>" +
              (r.demo ? '<span class="tag tag--warn">demo</span>' : "") + "</span></td>" +
            "<td>" + (r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—") + "</td>" +
            '<td><span data-countdown="' + r.expiresAt + '" class="ttlcell"></span></td>' +
            (r.views !== undefined ? '<td class="num">' + (r.views || 0) + "</td>" : "") +
            '<td><span class="rowacts">' +
              '<button class="btn btn--ghost btn--sm" type="button" data-copy="' + esc(url) + '">Copy URL</button>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-del="' + esc(r.id) + '"' +
                (r.editToken ? ' data-token="' + esc(r.editToken) + '"' : "") + ">Delete</button>" +
            "</span></td></tr>";
        }).join("") + "</tbody></table></div>";
    }

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
  });
})();
