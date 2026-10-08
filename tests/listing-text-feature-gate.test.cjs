const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  findUnsupportedPropertyFeatures,
  removeUnsupportedImageClaims,
} =
  require(
    "../lib/listing-text-feature-gate.ts"
  );

test(
  "Bastgen case: unverified balcony is rejected",
  () => {
    const unsupported =
      findUnsupportedPropertyFeatures(
        {
          location: "Wustrau",
          propertyType:
            "Einfamilienhaus",
          rooms: "4",
          livingArea: "150",
          price: "590000",
          verifiedFeatures: "",
        },
        [
          {
            title:
              "Einfamilienhaus mit Balkon in Wustrau",
            text:
              "Das Objekt verf?gt ?ber einen Balkon.",
          },
        ]
      );

    assert.deepEqual(
      unsupported,
      [
        "Balkon",
      ]
    );
  }
);

test(
  "verified balcony is allowed",
  () => {
    const unsupported =
      findUnsupportedPropertyFeatures(
        {
          verifiedFeatures:
            "Balkon: vorhanden",
        },
        [
          {
            title:
              "Wohnung mit Balkon",
            text:
              "Zur Wohnung geh?rt ein Balkon.",
          },
        ]
      );

    assert.deepEqual(
      unsupported,
      []
    );
  }
);

test(
  "vision text alone does not verify balcony",
  () => {
    const unsupported =
      findUnsupportedPropertyFeatures(
        {
          verifiedFeatures: "",
        },
        [
          {
            title:
              "Haus mit Balkon",
            text:
              "Ein Balkon erg?nzt die Immobilie.",
          },
        ]
      );

    assert.deepEqual(
      unsupported,
      [
        "Balkon",
      ]
    );
  }
);

test(
  "balcony image line is removed before repair",
  () => {
    const cleaned =
      removeUnsupportedImageClaims(
        [
          "Wohnzimmer mit Parkett",
          "Balkon sichtbar",
          "Helle K?che",
        ].join("\n"),
        [
          "Balkon",
        ]
      );

    assert.equal(
      cleaned,
      [
        "Wohnzimmer mit Parkett",
        "Helle K?che",
      ].join("\n")
    );
  }
);

test(
  "multiple unsupported hard features are detected",
  () => {
    const unsupported =
      findUnsupportedPropertyFeatures(
        {
          verifiedFeatures: "",
        },
        [
          {
            title:
              "Haus mit Balkon und Garage",
            text:
              "Ein Garten erg?nzt das Angebot.",
          },
        ]
      );

    assert.deepEqual(
      unsupported,
      [
        "Balkon",
        "Garten",
        "Garage",
      ]
    );
  }
);
