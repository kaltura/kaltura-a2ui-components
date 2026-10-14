// Web-component adapter entry. SECONDARY path, for plain-HTML and non-A2UI hosts.
// Never the A2UI consumption path (that is adapters/react).
//
// This file is the entry of the IIFE bundle (dist/kaltura-wc.js). The bundle has no ES
// exports. It sets the global `KalturaA2UIWebComponents` to the names of ./host and
// defines the custom elements. The published types are in ./global.

import '../../styles/components.css';
import { defineKalturaWebComponents } from './host';

export * from './host';

// Auto-define on import. The IIFE bundle is meant to be dropped into a page via
// a <script> tag, after which the custom elements are immediately usable.
defineKalturaWebComponents();
