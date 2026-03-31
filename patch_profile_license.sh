sed -i -e '/{[/]* Core Attributes [*]/i \'\
'            {/* Physical Traits */}\'\
'            <View style={styles.section}>\'\
'                <View style={styles.sectionHeader}>\'\
'                    <MaterialCommunityIcons name="human" size={20} color={AuthColors.crimson} />\'\
'                    <Text style={styles.sectionTitle}>PHYSICAL TRAITS</Text>\'\
'                </View>\'\
'                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 }}>'\
'                    <View style={{ width: "48%", marginBottom: 12 }}>'\
'                        <Text style={styles.infoLabel}>AGE</Text>'\
'                        <Text style={styles.infoName}>{avatar.age || "?"}</Text>'\
'                    </View>'\
'                    <View style={{ width: "48%", marginBottom: 12 }}>'\
'                        <Text style={styles.infoLabel}>SEX</Text>'\
'                        <Text style={styles.infoName}>{avatar.sex ? avatar.sex.toUpperCase() : "?"}</Text>'\
'                    </View>'\
'                    <View style={{ width: "48%", marginBottom: 12 }}>'\
'                        <Text style={styles.infoLabel}>HEIGHT</Text>'\
'                        <Text style={styles.infoName}>{avatar.height_cm ? `${avatar.height_cm} CM` : "?"}</Text>'\
'                    </View>'\
'                    <View style={{ width: "48%", marginBottom: 12 }}>'\
'                        <Text style={styles.infoLabel}>WEIGHT</Text>'\
'                        <Text style={styles.infoName}>{avatar.weight_kg ? `${avatar.weight_kg} KG` : "?"}</Text>'\
'                    </View>'\
'                </View>\'\
'            </View>\'\
'' components/profile/ProfileLicense.tsx
