import { scheduleOnce } from "@ember/runloop";
import { htmlSafe } from "@ember/template";
import discourseComputed from "discourse/lib/decorators";
import { isTesting } from "discourse/lib/environment";
import loadScript from "discourse/lib/load-script";
import AdComponent from "discourse/plugins/discourse-adplugin/discourse/components/ad-component";

let _loaded = false,
    _promise = null,
    _c = 0;

function loadAdsterra() {
    if (_loaded) {
        return Promise.resolve();
    }

    if (_promise) {
        return _promise;
    }

    _promise = loadScript("//d2lcbe7lfxs26z.cloudfront.net/ad.js", {
        scriptTag: true,
    }).then(function () {
        _loaded = true;
    });

    return _promise;
}

export default class AdsterraBannerAd extends AdComponent {
    key = null;
    width = null;
    height = null;
    divId = null;

    init() {
        let configKey = "adsterra_";
        let widthKey = "adsterra_";
        let heightKey = "adsterra_";

        if (this.site.mobileView) {
            configKey += "mobile_";
            widthKey += "mobile_";
            heightKey += "mobile_";
        }

        const placement = this.get("placement").replace(/-/g, "_");
        configKey += placement + "_key";
        widthKey += placement + "_width";
        heightKey += placement + "_height";

        this.set("key", this.siteSettings[configKey]);
        this.set("width", parseInt(this.siteSettings[widthKey], 10) || 320);
        this.set("height", parseInt(this.siteSettings[heightKey], 10) || 50);

        let divId = "adsterra-banner-" + placement + "-" + _c;
        this.set("divId", divId);
        _c++;

        super.init();
    }

    @discourseComputed("width", "height")
    adWrapperStyle(w, h) {
        return htmlSafe(`width: ${w}px; height: ${h}px; margin: 0 auto;`);
    }

    _triggerAds() {
        if (isTesting()) {
            return; // Don't load external JS during tests
        }

        const key = this.get("key");
        if (!key) {
            return;
        }

        loadAdsterra().then(() => {
            if (window.atOptions) {
                // Clear any existing atOptions to avoid conflicts
                delete window.atOptions;
            }

            // Set up Adsterra options for this specific ad
            window.atOptions = {
                key: key,
                format: "iframe",
                height: this.get("height"),
                width: this.get("width"),
                params: {},
            };

            // Create and inject the script
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "//www.topcreativeformat.com/" + key + "/invoke.js";
            script.async = true;

            const container = document.getElementById(this.get("divId"));
            if (container) {
                container.appendChild(script);
            }
        });
    }

    didInsertElement() {
        super.didInsertElement();
        scheduleOnce("afterRender", this, this._triggerAds);
    }

    @discourseComputed
    showAdsterraAds() {
        if (!this.currentUser) {
            return true;
        }

        return this.currentUser.show_adsterra_ads;
    }

    @discourseComputed(
        "key",
        "showAdsterraAds",
        "showToGroups",
        "showAfterPost",
        "showOnCurrentPage"
    )
    showAd(key, showAdsterraAds, showToGroups, showAfterPost, showOnCurrentPage) {
        return (
            key && showAdsterraAds && showToGroups && showAfterPost && showOnCurrentPage
        );
    }

    @discourseComputed("postNumber")
    showAfterPost(postNumber) {
        if (!postNumber) {
            return true;
        }
        return this.isNthPost(parseInt(this.siteSettings.adsterra_nth_post, 10));
    }
} 