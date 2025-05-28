import { scheduleOnce } from "@ember/runloop";
import discourseComputed from "discourse/lib/decorators";
import { isTesting } from "discourse/lib/environment";
import AdComponent from "discourse/plugins/discourse-adplugin/discourse/components/ad-component";

let _c = 0;

export default class AdsterraNativeAd extends AdComponent {
    scriptSrc = null;
    containerId = null;
    divId = null;

    init() {
        let scriptKey = "adsterra_native_";
        let containerKey = "adsterra_native_";

        if (this.site.mobileView) {
            scriptKey += "mobile_";
            containerKey += "mobile_";
        }

        const placement = this.get("placement").replace(/-/g, "_");
        scriptKey += placement + "_script_src";
        containerKey += placement + "_container_id";

        this.set("scriptSrc", this.siteSettings[scriptKey]);
        this.set("containerId", this.siteSettings[containerKey]);

        let divId = "adsterra-native-" + placement + "-" + _c;
        this.set("divId", divId);
        _c++;

        super.init();
    }

    _triggerAds() {
        if (isTesting()) {
            return; // Don't load external JS during tests
        }

        const scriptSrc = this.get("scriptSrc");
        const containerId = this.get("containerId");

        if (!scriptSrc || !containerId) {
            return;
        }

        // Create the container div with the specified ID
        const mainContainer = document.getElementById(this.get("divId"));
        if (mainContainer) {
            const adContainer = document.createElement("div");
            adContainer.id = containerId;
            mainContainer.appendChild(adContainer);

            // Create and inject the script
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = scriptSrc;
            script.async = true;
            script.setAttribute("data-cfasync", "false");

            mainContainer.appendChild(script);
        }
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
        "scriptSrc",
        "containerId",
        "showAdsterraAds",
        "showToGroups",
        "showAfterPost",
        "showOnCurrentPage"
    )
    showAd(
        scriptSrc,
        containerId,
        showAdsterraAds,
        showToGroups,
        showAfterPost,
        showOnCurrentPage
    ) {
        return (
            scriptSrc &&
            containerId &&
            showAdsterraAds &&
            showToGroups &&
            showAfterPost &&
            showOnCurrentPage
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